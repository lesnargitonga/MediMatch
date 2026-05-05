import { Router } from 'express';
import { pool } from '../config/db';
import { fileDb } from '../db/fileDb';
import { mockDB } from '../mock/db';

const router = Router();

router.get('/readiness', async (_req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true' || process.env.USE_FILE_DB === 'true') {
      return res.json({ status: 'ready', backend: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'file' });
    }
    const { rows } = await pool.query('SELECT 1 as ok');
    if (rows && rows[0] && rows[0].ok === 1) return res.json({ status: 'ready', backend: 'postgres' });
    return res.status(503).json({ status: 'degraded' });
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err?.message || 'unavailable' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json({
        backend: 'mock',
        users: mockDB.users.length,
        listings: mockDB.listings.length,
        matches: mockDB.matches.length
      });
    }

    if (process.env.USE_FILE_DB === 'true') {
      const counts = fileDb.getCounts();
      return res.json({ backend: 'file', ...counts });
    }

    const q = `SELECT 
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM listings) AS listings,
        (SELECT COUNT(*)::int FROM matches) AS matches`;
    const { rows } = await pool.query(q);
    return res.json({ backend: 'postgres', ...rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

export default router;
