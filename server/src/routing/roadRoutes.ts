import fs from 'fs';
import path from 'path';

/**
 * Road geometry for supply transfers.
 *
 * Transfers move by road, so a route is drawn along the road network, never
 * as a curve, unless no road route is known. Two sources, in order:
 *
 *  1. The stored cache, server/data/road-routes.json. It is built by
 *     src/tools/buildRoadRoutes.ts against a self-hosted OSRM instance on an
 *     OpenStreetMap extract. It is a derivative of OpenStreetMap data,
 *     © OpenStreetMap contributors, available under the ODbL (see
 *     server/data/ROAD-ROUTES-LICENCE.md).
 *  2. A live router, only when ROUTING_URL names one (for example a local
 *     OSRM at http://127.0.0.1:5000). There is deliberately no default: the
 *     public OSRM demo server is limited to non-commercial use without
 *     guarantees, so the product does not depend on it.
 *
 * Callers fall back to an estimated curve, labelled as such, when both miss.
 */

export type LatLon = { lat: number; lon: number };
export type RoadRoute = { coords: [number, number][]; distanceKm: number; durationMin: number };

type CacheFile = {
  meta: Record<string, string>;
  routes: Record<string, { coords: [number, number][]; distance_km: number; duration_min: number }>;
};

const CACHE_PATH = path.resolve(__dirname, '../../data/road-routes.json');
const LIVE_TIMEOUT_MS = 3500;

let cache: CacheFile | null | undefined;

export function routeKey(a: LatLon, b: LatLon): string {
  const p = (x: LatLon) => `${x.lat.toFixed(5)},${x.lon.toFixed(5)}`;
  return `${p(a)}>${p(b)}`;
}

function loadCache(): CacheFile | null {
  if (cache !== undefined) return cache;
  if (process.env.ROAD_CACHE === 'off') return (cache = null);
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as CacheFile;
  } catch (err) {
    console.warn(`[routing] no road route cache at ${CACHE_PATH}: ${(err as Error).message}`);
    cache = null;
  }
  return cache;
}

export function cachedRoute(a: LatLon, b: LatLon): RoadRoute | null {
  const hit = loadCache()?.routes[routeKey(a, b)];
  return hit ? { coords: hit.coords, distanceKm: hit.distance_km, durationMin: hit.duration_min } : null;
}

export async function liveRoute(a: LatLon, b: LatLon): Promise<RoadRoute | null> {
  const base = process.env.ROUTING_URL;
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIVE_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j: any = await r.json();
    const route = j?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const coords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    return { coords, distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch (err) {
    console.warn(`[routing] live route failed: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
