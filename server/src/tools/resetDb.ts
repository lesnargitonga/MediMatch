import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../config/db';

async function run() {
  const candidateTables = ['matches','listings','users'];
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [candidateTables]
  );
  const existing = rows.map(r => r.table_name) as string[];
  if (!existing.length) {
    console.log('No known tables found to reset.');
    return;
  }
  // Order to avoid FK issues if CASCADE isn't sufficient in some cases
  const order = ['matches','listings','users'].filter(t => existing.includes(t));
  const sql = `TRUNCATE TABLE ${order.map(t=>`"${t}"`).join(', ')} RESTART IDENTITY CASCADE`;
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('COMMIT');
    console.log('Reset complete:', order.join(', '));
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
}

run().then(()=>process.exit(0)).catch(err=>{ console.error(err); process.exit(1); });
