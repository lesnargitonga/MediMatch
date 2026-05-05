import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../config/db';
import { fileDb } from '../db/fileDb';

async function ensureSchema() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    category TEXT NOT NULL DEFAULT 'general',
    location GEOGRAPHY(POINT,4326),
    created_at TIMESTAMP DEFAULT now()
  )`);
  // In case table exists without the new column
  await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)`);
}

function pointFromAny(loc: any): { lat?: number; lon?: number } {
  if (!loc) return {};
  if (typeof loc === 'object' && loc.lat != null && loc.lon != null) return { lat: Number(loc.lat), lon: Number(loc.lon) };
  const s = String(loc);
  const m = s.match(/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i);
  if (m) return { lon: Number(m[1]), lat: Number(m[2]) };
  return {};
}

async function main() {
  const counts = fileDb.getCounts();
  console.log('Importing from file DB → Postgres', counts);
  await ensureSchema();

  // users
  for (const u of fileDb.getUsers()) {
    await pool.query(
      `INSERT INTO users(id, email, password_hash, name, role, created_at)
       VALUES ($1,$2,$3,$4,COALESCE($5,'user'),COALESCE($6, now()))
       ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, name=EXCLUDED.name, role=EXCLUDED.role`,
      [u.id, u.email, (u as any).password_hash, (u as any).name || null, (u as any).role || 'user', (u as any).created_at || null]
    );
  }

  // listings
  for (const l of fileDb.getListings()) {
    const p = pointFromAny((l as any).location_wkt || (l as any).location);
    const wkt = p.lat != null && p.lon != null ? `POINT(${p.lon} ${p.lat})` : null;
    await pool.query(
      `INSERT INTO listings(id, owner_id, title, description, quantity, category, location, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $7::text IS NULL THEN NULL ELSE ST_GeogFromText($7::text) END, COALESCE($8, now()))
       ON CONFLICT (id) DO UPDATE SET owner_id=EXCLUDED.owner_id, title=EXCLUDED.title, description=EXCLUDED.description, quantity=EXCLUDED.quantity, category=EXCLUDED.category, location=EXCLUDED.location, created_at=EXCLUDED.created_at`,
      [
        l.id,
        (l as any).owner_id || null,
        l.title,
        (l as any).description || null,
        (l as any).quantity ?? 1,
        (l as any).category || 'general',
        wkt,
        (l as any).created_at || null,
      ]
    );
  }

  // align sequences
  await pool.query(`SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users),0)+1, false)`);
  await pool.query(`SELECT setval(pg_get_serial_sequence('listings','id'), COALESCE((SELECT MAX(id) FROM listings),0)+1, false)`);
  await pool.query(`SELECT setval(pg_get_serial_sequence('matches','id'), COALESCE((SELECT MAX(id) FROM matches),0)+1, false)`);

  console.log('Import complete.');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
