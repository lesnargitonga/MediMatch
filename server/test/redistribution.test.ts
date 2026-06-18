process.env.USE_MOCK_DB = 'true';

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

describe('Redistribution plan endpoint', () => {
  it('returns a synthetic Kenya facility plan without external routing', async () => {
    const res = await request(app).get('/api/redistribution/plan?roads=0');

    expect(res.status).toBe(200);
    expect(res.body.scenario).toMatchObject({
      geography: 'Kenya',
      inventory_data: 'Synthetic conference demonstration data',
    });
    expect(res.body.nodes.length).toBeGreaterThan(10);
    expect(res.body.routes.length).toBeGreaterThan(5);
    expect(res.body.routes[0].geometry.length).toBeGreaterThan(2);
    expect(res.body.impact.units_moved).toBeGreaterThan(0);
  });
});
