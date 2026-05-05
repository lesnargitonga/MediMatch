import bcrypt from 'bcrypt';
import { pool } from '../config/db';

async function ensureBaseSchema() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      org_name TEXT,
      org_type TEXT,
      org_license_id TEXT,
      org_phone TEXT,
      org_address TEXT,
      doc_url TEXT,
      org_verified BOOLEAN NOT NULL DEFAULT false,
      disabled BOOLEAN NOT NULL DEFAULT false,
      average_rating NUMERIC(3,2) DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
      category TEXT NOT NULL DEFAULT 'general',
      location GEOGRAPHY(POINT,4326),
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      is_urgent BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_listings_is_urgent ON listings(is_urgent)`);
}

export async function autoSeedOnEmpty() {
  if (process.env.USE_MOCK_DB === 'true' || process.env.USE_FILE_DB === 'true') {
    return; // not seeding Postgres when mock/file DB is used
  }
  try {
    await ensureBaseSchema();
    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
    const count = rows[0]?.c ?? 0;
    if (count > 0) return;

    const pwAdmin = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'password123', 10);
    const pwUser = await bcrypt.hash('password123', 10);

    // Admins
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, disabled) VALUES ($1,$2,$3,'admin', false) ON CONFLICT (email) DO NOTHING`,
      [process.env.ADMIN_EMAIL || 'lesnar@admin.com', pwAdmin, 'Admin Lesnar']
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, disabled) VALUES ($1,$2,$3,'admin', false) ON CONFLICT (email) DO NOTHING`,
      ['admin2@medimatch.com', pwAdmin, 'Admin Two']
    );

    // Users
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, org_name, org_type, org_license_id, org_verified)
       VALUES ($1,$2,$3,'user',$4,$5,$6,true) ON CONFLICT (email) DO NOTHING`,
      ['central@hospital.com', pwUser, 'Central Hospital', 'Central Hospital', 'Hospital', 'LIC-10001']
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, org_name, org_type, org_license_id, org_verified)
       VALUES ($1,$2,$3,'user',$4,$5,$6,true) ON CONFLICT (email) DO NOTHING`,
      ['clinic@medimatch.com', pwUser, 'MediMatch Clinic', 'MediMatch Clinic', 'Clinic', 'LIC-20002']
    );
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, org_name, org_type, org_license_id, org_verified)
       VALUES ($1,$2,$3,'user',$4,$5,$6,true) ON CONFLICT (email) DO NOTHING`,
      ['relief@ngo.org', pwUser, 'Relief NGO', 'Relief NGO', 'NGO', 'LIC-30003']
    );

    // Sample listings for visibility: add variety per user
    const urows = await pool.query(`SELECT id, email FROM users WHERE email IN ('central@hospital.com','clinic@medimatch.com','relief@ngo.org')`);
    const baseLon = 36.8219; const baseLat = -1.2921;
    const samples = [
      { title: 'Urgent PPE shipment', category: 'ppe', qty: 200, urgent: true },
      { title: 'General medication pack', category: 'medication', qty: 80, urgent: false },
      { title: 'Diagnostic equipment', category: 'equipment', qty: 5, urgent: false },
      { title: 'Consumables bulk', category: 'consumables', qty: 500, urgent: true },
    ];
    for (const r of urows.rows) {
      for (const s of samples) {
        const jitterLon = baseLon + (Math.random() - 0.5) * 0.08;
        const jitterLat = baseLat + (Math.random() - 0.5) * 0.06;
        await pool.query(
          `INSERT INTO listings (owner_id, title, description, category, quantity, is_urgent, location)
           VALUES ($1,$2,$3,$4,$5,$6, geography(ST_SetSRID(ST_MakePoint($7,$8),4326)))`,
          [
            r.id,
            s.title,
            `Seeded listing for ${r.email}: ${s.title}`,
            s.category,
            s.qty,
            s.urgent,
            jitterLon,
            jitterLat,
          ]
        );
      }
    }

    // Ensure sequences align
    await pool.query(`SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users),0)+1, false)`);
    await pool.query(`SELECT setval(pg_get_serial_sequence('listings','id'), COALESCE((SELECT MAX(id) FROM listings),0)+1, false)`);

    console.log('[seed] Auto-seeded baseline users and listings (Postgres).');
  } catch (err:any) {
    console.warn('[seed] auto-seed skipped or failed:', err?.message || err);
  }
}
