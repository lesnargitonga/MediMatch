// Force mock DB for tests and raise timeout
process.env.USE_MOCK_DB = 'true';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app';
import { mockDB } from '../src/mock/db';

describe('Auth endpoints (mockDB)', () => {
  beforeEach(() => {
    // reset mockDB to initial seeded state
    mockDB.users = mockDB.users.slice(0, 1);
    mockDB.nextUserId = 2;
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /api/auth/login with seeded user sets auth cookie and returns user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'Password123' });
    expect(res.status).toBe(200);
    // server authenticates via httpOnly cookie (token cookie), ensure it's set
    expect(res.headers).toHaveProperty('set-cookie');
    expect(res.body.user).toMatchObject({ email: 'test@example.com' });
  });
});
