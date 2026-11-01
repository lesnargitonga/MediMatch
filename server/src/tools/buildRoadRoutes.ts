/**
 * Build server/data/road-routes.json, the stored road geometry for every
 * transfer in the demonstration plan.
 *
 * It runs the real plan controller with the cache bypassed and a live router
 * named by ROUTING_URL, then stores each road-routed transfer. Use a
 * self-hosted OSRM on an OpenStreetMap extract, not the public demo server
 * (non-commercial use only, no guarantees):
 *
 *   docker run -d --name osrm-kenya -p 127.0.0.1:5000:5000 -v ~/osrm-kenya:/data \
 *     ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-routed --algorithm mld /data/kenya-latest.osrm
 *   USE_MOCK_DB=true ROAD_CACHE=off ROUTING_URL=http://127.0.0.1:5000 \
 *     OSM_EXTRACT="geofabrik kenya-latest.osm.pbf" OSM_EXTRACT_MD5=<md5> \
 *     npx ts-node src/tools/buildRoadRoutes.ts
 *
 * The output is a derivative of OpenStreetMap data (ODbL); see
 * server/data/ROAD-ROUTES-LICENCE.md.
 */
import fs from 'fs';
import path from 'path';
import { getRedistributionPlan } from '../controllers/redistribution.controller';
import { routeKey } from '../routing/roadRoutes';

const OUT = path.resolve(__dirname, '../../data/road-routes.json');
// ~15 m at Kenyan latitudes: keeps the road's shape at street zoom, drops OSRM's
// per-vertex detail so the plan stays small enough to load with the page.
const SIMPLIFY_TOLERANCE_DEG = 0.00014;

/** Ramer-Douglas-Peucker on [lat, lon] pairs. */
function simplify(pts: [number, number][], tol: number): [number, number][] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ay, ax] = pts[a], [by, bx] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let worst = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][1] - ax) - dx * (pts[i][0] - ay)) / len;
      if (d > worst) { worst = d; idx = i; }
    }
    if (worst > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set (see the header of this file)`);
  return v;
}

async function main() {
  if (process.env.ROAD_CACHE !== 'off') throw new Error('Set ROAD_CACHE=off so every route is computed fresh');
  const router = required('ROUTING_URL');
  const extract = required('OSM_EXTRACT');
  const extractMd5 = required('OSM_EXTRACT_MD5');

  let plan: any;
  let status = 200;
  await getRedistributionPlan(
    { query: { roads: '1' } } as any,
    { json: (d: any) => { plan = d; }, status: (s: number) => { status = s; return { json: (d: any) => { plan = d; } }; } } as any,
  );
  if (status !== 200 || !plan?.routes) throw new Error(`plan failed with status ${status}`);

  const routes: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const r of plan.routes) {
    const key = routeKey(r.from, r.to);
    if (!r.routed) { missing.push(`${r.from.org} → ${r.to.org}`); continue; }
    routes[key] = {
      coords: simplify(r.geometry, SIMPLIFY_TOLERANCE_DEG).map(([lat, lon]) => [Number(lat.toFixed(5)), Number(lon.toFixed(5))]),
      distance_km: Number(r.distance_km),
      duration_min: Number(r.eta_min),
    };
  }
  if (missing.length) throw new Error(`no road route for ${missing.length} transfer(s): ${missing.join('; ')}`);

  const sorted = Object.fromEntries(Object.keys(routes).sort().map((k) => [k, routes[k]]));
  const file = {
    meta: {
      description: 'Road geometry for every transfer in the MediMatch demonstration plan.',
      router: `self-hosted OSRM (${router.startsWith('http://127.0.0.1') ? 'local' : router}), car profile`,
      osm_extract: extract,
      osm_extract_md5: extractMd5,
      simplification: `Ramer-Douglas-Peucker, ${SIMPLIFY_TOLERANCE_DEG} degrees (about 15 m)`,
      licence: 'ODbL 1.0 — derivative of OpenStreetMap data',
      attribution: '© OpenStreetMap contributors',
      generated: new Date().toISOString().slice(0, 10),
    },
    routes: sorted,
  };
  fs.writeFileSync(OUT, JSON.stringify(file) + '\n');
  console.log(`wrote ${Object.keys(sorted).length} road routes to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
