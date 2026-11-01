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

  it('serves every transfer along a stored road route, with no router configured', async () => {
    delete process.env.ROUTING_URL;
    const res = await request(app).get('/api/redistribution/plan?roads=0');

    expect(res.status).toBe(200);
    expect(res.body.routes.length).toBeGreaterThan(5);
    expect(res.body.routes.every((r: any) => r.routed)).toBe(true);
    expect(res.body.impact.roads_used).toBe(true);
    for (const r of res.body.routes) expect(r.geometry.length).toBeGreaterThan(2);
  });
});
