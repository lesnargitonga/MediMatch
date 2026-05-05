process.env.USE_MOCK_DB = 'true';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
// increase default timeout for slower CI environments
import { beforeAll } from 'vitest';
beforeAll(() => { (global as any).testTimeout = 20000; });
import app from '../src/app';
import { mockDB } from '../src/mock/db';

describe('Listings endpoints (mockDB)', () => {
  beforeEach(() => {
    mockDB.listings = mockDB.listings.slice(0, 1);
    mockDB.nextListingId = 2;
  });

  it('GET /api/listings returns seeded listings', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/listings creates a new listing when authenticated', async () => {
    // login first
    const login = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'Password123' });
    expect(login.status).toBe(200);
    const token = login.body.token;

    const payload = { title: 'Gauze packs', description: '20 packs available', quantity: 20, location: { lat: 40.7, lon: -73.9 } };
    const res = await request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Gauze packs');
  });
});
