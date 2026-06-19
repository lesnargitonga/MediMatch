import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { mockDB } from '../mock/db';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  if (process.env.USE_MOCK_DB === 'true') {
    const role = mockDB.users.find((u: any) => u.id === userId)?.role || 'user';
    if (role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    return next();
  }
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    const role = rows[0]?.role || 'user';
    if (role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    next();
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
}
