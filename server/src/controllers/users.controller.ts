import { Request, Response } from 'express';
import { pool } from '../config/db';
import { fileDb } from '../db/fileDb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mockDB } from '../mock/db';
import { RegisterSchema, LoginSchema, UserUpdateSchema } from '../validation/schemas';
import { createNotification } from './notifications.controller';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Logout: clear the JWT cookie
export async function logout(req: Request, res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true });
}

export async function register(req: Request, res: Response) {
  console.log('Register endpoint called with body:', req.body);
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    const first = parse.error.errors[0];
    console.log('Register validation failed:', first);
    return res.status(400).json({ error: first?.message || 'invalid input', path: first?.path || [] });
  }
  const { email, password, name, org_name, org_type, org_license_id, org_phone, org_address, doc_url } = parse.data as any;
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ error: 'email and password required' });
  }
  let user;
  if (process.env.USE_MOCK_DB === 'true') {
    const exists = mockDB.users.find((u: any) => u.email === email);
    if (exists) {
      console.log('MockDB: email already in use');
      return res.status(400).json({ error: 'email already in use' });
    }
    const hash = await bcrypt.hash(password, 10);
    const adminEnv = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const roleVal = adminEnv && adminEnv === email.toLowerCase() ? 'admin' : 'user';
    user = {
      id: mockDB.nextUserId++,
      email,
      name: name || null,
      password_hash: hash,
      role: roleVal,
      org_name: org_name || null,
      org_type: org_type || null,
      org_license_id: org_license_id || null,
      org_phone: org_phone || null,
      org_address: org_address || null,
      doc_url: doc_url || null,
      org_verified: roleVal === 'admin',
    };
    mockDB.users.push(user);
    console.log('MockDB: user registered', user);
  } else if (process.env.USE_FILE_DB === 'true') {
    const exists = fileDb.findUserByEmail(email);
    if (exists) {
      console.log('FileDB: email already in use');
      return res.status(400).json({ error: 'email already in use' });
    }
    user = fileDb.createUser({ email, password, name });
    console.log('FileDB: user registered', user);
  } else {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
      if (rows.length) {
        console.log('Postgres: email already in use');
        return res.status(400).json({ error: 'email already in use' });
      }
      const hash = await bcrypt.hash(password, 10);
      const adminEnv = (process.env.ADMIN_EMAIL || '').toLowerCase();
      const roleVal = adminEnv && adminEnv === email.toLowerCase() ? 'admin' : 'user';
      console.log('Postgres: inserting user', { email, name, roleVal });
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, role, org_name, org_type, org_license_id, org_phone, org_address, doc_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, email, name, role, org_name, org_type, org_license_id, org_phone, org_address, doc_url, org_verified`,
        [email, hash, name || null, roleVal, org_name, org_type, org_license_id, org_phone || null, org_address || null, doc_url || null]
      );
      user = result.rows[0];
      console.log('Postgres: user registered', user);
    } catch (err: any) {
      console.error('Postgres: registration error', err);
      const payload: any = { error: 'server error' };
      if (process.env.NODE_ENV !== 'production') {
        payload.detail = err?.message || String(err);
      }
      return res.status(500).json(payload);
    } finally {
      client.release();
    }
  }
  // Issue JWT and set as httpOnly cookie
  let userId = user.id;
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    if (!isNaN(parsed)) userId = parsed;
  }
  const token = jwt.sign({ userId }, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  // Set cookie flags dynamically for local dev and production
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const isHttps = req.protocol === 'https';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === 'production',
    sameSite: (isHttps || process.env.NODE_ENV === 'production') ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });

  // Notify admins: new account created (Postgres env only)
  try {
    if (process.env.USE_MOCK_DB !== 'true' && process.env.USE_FILE_DB !== 'true') {
      const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      const display = user.name || user.email;
      for (const admin of admins.rows) {
        // Don't notify the user themselves if they happen to be an admin
        if (admin.id === userId) continue;
        await createNotification({
          user_id: admin.id,
          type: 'system',
          title: 'New account created',
          message: `${display} just registered`,
          link: '/dashboard',
          related_user_id: typeof userId === 'number' ? userId : Number(userId) || undefined,
        });
      }
    }
  } catch (err) {
    console.error('[NOTIFICATION] Failed to notify admins of new registration:', err);
  }

  res.json({ user });
}

export async function login(req: Request, res: Response) {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    const first = parse.error.errors[0];
    return res.status(400).json({ error: first?.message || 'invalid input', path: first?.path || [] });
  }
  const { email, password } = parse.data;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  let user;
  if (process.env.USE_MOCK_DB === 'true') {
    user = mockDB.users.find((u: any) => u.email === email);
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });
  } else if (process.env.USE_FILE_DB === 'true') {
    user = fileDb.findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });
  } else {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT id, password_hash, email, name, role, org_name, org_type, org_license_id, org_phone, org_address, doc_url, org_verified, disabled FROM users WHERE LOWER(email)=LOWER($1)', [email]);
      user = rows[0];
      if (!user) return res.status(400).json({ error: 'invalid credentials' });
      if (user.disabled) return res.status(403).json({ error: 'account disabled' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(400).json({ error: 'invalid credentials' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'server error' });
    } finally {
      client.release();
    }
  }
  // Issue JWT and set as httpOnly cookie
  let userId = user.id;
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    if (!isNaN(parsed)) userId = parsed;
  }
  const token = jwt.sign({ userId }, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  // Set cookie flags dynamically for local dev and production
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const isHttps = req.protocol === 'https';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === 'production',
    sameSite: (isHttps || process.env.NODE_ENV === 'production') ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  // Remove sensitive fields before sending user object
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
}

export async function me(req: Request, res: Response) {
  let userId = (req as any).userId;
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    if (!isNaN(parsed)) userId = parsed;
  }
  try {
    console.log('Auth /me called. userId:', userId);
    if (process.env.USE_MOCK_DB === 'true') {
      const user = mockDB.users.find((u: any) => u.id === userId);
      if (!user) {
        console.log('MockDB: not logged in');
        return res.status(401).json({ error: 'not logged in' });
      }
      console.log('MockDB: returning user', user);
      return res.json(user);
    } else if (process.env.USE_FILE_DB === 'true') {
      const user = fileDb.findUserById(userId);
      if (!user) {
        console.log('FileDB: not logged in');
        return res.status(401).json({ error: 'not logged in' });
      }
      console.log('FileDB: returning user', user);
      return res.json(user);
    } else {
      if (!userId) {
        console.log('Postgres: not logged in, userId missing');
        return res.status(401).json({ error: 'not logged in' });
      }
      // Fetch user from DB using userId
      const client = await pool.connect();
      try {
        const { rows } = await client.query('SELECT id, email, name, role, org_name, org_type, org_license_id, org_phone, org_address, doc_url, org_verified FROM users WHERE id = $1', [userId]);
        const user = rows[0];
        if (!user) {
          console.log('Postgres: user not found');
          return res.status(401).json({ error: 'not logged in' });
        }
        console.log('Postgres: returning user', user);
        return res.json(user);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'server error' });
  }
}

export async function updateMe(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const parse = UserUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    const first = parse.error.errors[0];
    return res.status(400).json({ error: first?.message || 'invalid input', path: first?.path || [] });
  }
  const { name, password, org_name, org_type, org_address } = parse.data as any;

  if (process.env.USE_MOCK_DB === 'true') {
    const user = mockDB.users.find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'not found' });
    if (name !== undefined) user.name = name || null;
    if (password) user.password_hash = await bcrypt.hash(password, 10);
    return res.json({ id: user.id, email: user.email, name: user.name });
  }

  if (process.env.USE_FILE_DB === 'true') {
    const duser = fileDb.updateUser({ id: userId, name, password });
    if (!duser) return res.status(404).json({ error: 'not found' });
    return res.json({ id: duser.id, email: duser.email, name: duser.name });
  }

  const client = await pool.connect();
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);
    }
    if (name !== undefined) {
      await client.query('UPDATE users SET name=$1 WHERE id=$2', [name || null, userId]);
    }
    if (org_name !== undefined) {
      await client.query('UPDATE users SET org_name=$1 WHERE id=$2', [org_name || null, userId]);
    }
    if (org_type !== undefined) {
      await client.query('UPDATE users SET org_type=$1 WHERE id=$2', [org_type || null, userId]);
    }
    if (org_address !== undefined) {
      await client.query('UPDATE users SET org_address=$1 WHERE id=$2', [org_address || null, userId]);
    }
    const { rows } = await client.query('SELECT id, email, name, role, org_name, org_type, org_license_id, org_phone, org_address, doc_url, org_verified FROM users WHERE id=$1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}
