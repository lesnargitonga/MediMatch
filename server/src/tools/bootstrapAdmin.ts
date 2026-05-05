import dotenv from 'dotenv';
import path from 'path';
// Load env from the server folder explicitly so cwd doesn't matter
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { pool } from '../config/db';
import bcrypt from 'bcrypt';

function generatePassword(len = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function run() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail) {
    // Check if the user already exists
    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, [adminEmail]);
    if (existing.rowCount && existing.rows[0]) {
      const userId = existing.rows[0].id as number;
      await pool.query(`UPDATE users SET role='admin' WHERE id=$1`, [userId]);
      const pw = (process.env.ADMIN_PASSWORD || '').trim();
      if (pw) {
        const hash = await bcrypt.hash(pw, 10);
        await pool.query(`UPDATE users SET password_hash=$1, disabled=false WHERE id=$2`, [hash, userId]);
        console.log(`Promoted ${adminEmail} to admin and reset password from ADMIN_PASSWORD.`);
      } else {
        console.log(`Promoted ${adminEmail} to admin. (Password unchanged)`);
      }
      return;
    }
    console.log(`ADMIN_EMAIL ${adminEmail} not found. Creating new admin user...`);
    const password = (process.env.ADMIN_PASSWORD || '').trim() || generatePassword(18);
    const hash = await bcrypt.hash(password, 10);
    try {
      const ins = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, disabled) VALUES ($1,$2,$3,'admin', false) RETURNING id`,
        [adminEmail, hash, null]
      );
      console.log(`Created admin user ${adminEmail} with id ${ins.rows[0].id}.`);
      if (!process.env.ADMIN_PASSWORD) {
        console.log(`Temporary password (store securely, will not be shown again): ${password}`);
      } else {
        console.log('Password set from ADMIN_PASSWORD env variable.');
      }
      return;
    } catch (e: any) {
      if (String(e?.message || '').includes('duplicate')) {
        console.log('User exists but update failed; please retry.');
      } else {
        console.error('Failed to create admin user:', e?.message || e);
      }
      return;
    }
  }
  // If no admin exists, promote earliest user as a fallback bootstrap
  const { rows: admins } = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role='admin'`);
  if ((admins[0]?.c ?? 0) > 0) { console.log('At least one admin exists. No fallback promotion needed.'); return; }
  const { rows } = await pool.query(`SELECT id, email FROM users ORDER BY id ASC LIMIT 1`);
  if (!rows[0]) { console.log('No users found to promote.'); return; }
  const u = rows[0];
  await pool.query(`UPDATE users SET role='admin' WHERE id=$1`, [u.id]);
  console.log(`Promoted earliest user ${u.email} (id ${u.id}) to admin.`);
}

run().then(()=>process.exit(0)).catch(err=>{ console.error(err); process.exit(1); });
