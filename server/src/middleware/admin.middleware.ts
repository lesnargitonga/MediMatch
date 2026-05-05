import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    const role = rows[0]?.role || 'user';
    if (role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    next();
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
}
