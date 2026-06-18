import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Browser sessions use the httpOnly cookie; bearer auth keeps API/test clients compatible.
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.token || bearer;
  if (!token) {
    console.warn('[AUTH] No token cookie present for', req.method, req.path);
    return res.status(401).json({ error: 'no token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.userId;
    // Light touch tracing to confirm auth success for polling endpoints
    if (req.path.includes('notifications')) {
      console.log('[AUTH] Auth OK userId', payload.userId, 'for', req.path);
    }
    next();
  } catch {
    console.warn('[AUTH] Invalid token for', req.method, req.path);
    res.status(401).json({ error: 'invalid token' });
  }
}
