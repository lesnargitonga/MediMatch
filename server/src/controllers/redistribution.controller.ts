import { Request, Response } from 'express';
import { mockDB } from '../mock/db';
import { fileDb } from '../db/fileDb';
import { pool } from '../config/db';

/**
 * Redistribution planning endpoint — the geospatial brain made visible.
 *
 * GET /api/redistribution/plan?roads=1
 *  - Normalises listings into surplus offers and urgent requests.
 *  - Greedily matches each request to the nearest compatible surplus
 *    (triage order: urgent first), allocating quantity.
 *  - Returns map nodes, routed supply lines (real road geometry via OSRM,
 *    with a graceful curved-arc fallback), and aggregate impact metrics.
 *
 * Public (no auth) so it can anchor the landing experience.
 */

type Norm = {
  id: number; owner_id: number; org_name: string; county: string;
  title: string; category: string; item: string; quantity: number; is_urgent: boolean;
  kind: 'offer' | 'request'; lat: number; lon: number; created_at: string;
};

/**
 * Compatibility key for matching. Prefer the normalized item type so a request
 * only sources from the same product (insulin to insulin); fall back to category
 * for backends that don't carry an item field.
 */
function matchKey(n: { item?: string; category: string }): string {
  return (n.item && String(n.item)) || n.category;
}

function parsePoint(wkt: any): { lat: number; lon: number } | null {
  if (!wkt) return null;
  if (typeof wkt === 'object' && wkt.lat != null && wkt.lon != null) return { lat: Number(wkt.lat), lon: Number(wkt.lon) };
  const m = String(wkt).match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!m) return null;
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Curved great-circle-ish arc between two points (fallback when roads unavailable). */
function arc(a: { lat: number; lon: number }, b: { lat: number; lon: number }, steps = 28): [number, number][] {
  const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  // perpendicular offset for a gentle curve
  const dx = b.lon - a.lon, dy = b.lat - a.lat;
  const k = 0.18;
  const ctrl = { lat: mid.lat - dx * k, lon: mid.lon + dy * k };
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * ctrl.lat + t * t * b.lat;
    const lon = (1 - t) ** 2 * a.lon + 2 * (1 - t) * t * ctrl.lon + t * t * b.lon;
    pts.push([lat, lon]);
  }
  return pts;
}

async function osrmRoute(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j: any = await r.json();
    const route = j?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const coords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    return { coords, distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function loadListings(): Norm[] {
  const out: Norm[] = [];
  if (process.env.USE_MOCK_DB === 'true') {
    for (const l of mockDB.listings) {
      const owner = mockDB.users.find((u: any) => u.id === l.owner_id);
      const p = parsePoint(l.location_wkt);
      if (!p) continue;
      out.push({
        id: l.id, owner_id: l.owner_id, org_name: owner?.org_name || owner?.name || 'Facility',
        county: owner?.county || '', title: l.title, category: l.category || 'general',
        item: l.item || l.category || 'general',
        quantity: Number(l.quantity) || 1, is_urgent: !!l.is_urgent, kind: (l.kind || 'offer'),
        lat: p.lat, lon: p.lon, created_at: l.created_at,
      });
    }
  } else if (process.env.USE_FILE_DB === 'true') {
    for (const l of fileDb.getListings() as any[]) {
      const p = parsePoint(l.location_wkt || l.location);
      if (!p) continue;
      out.push({
        id: l.id, owner_id: l.owner_id, org_name: l.org_name || 'Facility', county: l.county || '',
        title: l.title, category: l.category || 'general', item: l.item || l.category || 'general',
        quantity: Number(l.quantity) || 1,
        is_urgent: !!l.is_urgent, kind: (l.kind || 'offer'), lat: p.lat, lon: p.lon, created_at: l.created_at,
      });
    }
  }
  return out;
}

export async function getRedistributionPlan(req: Request, res: Response) {
  try {
    // Conference mode is resilient by default. Real road geometry is opt-in.
    const useRoads = req.query.roads === '1';
    let items = loadListings();

    // Postgres path: query directly if not using mock/file backends.
    if (items.length === 0 && process.env.USE_MOCK_DB !== 'true' && process.env.USE_FILE_DB !== 'true') {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT l.id, l.owner_id, u.org_name, l.title, l.category, l.quantity, l.is_urgent,
                  COALESCE(l.kind,'offer') AS kind, ST_X(l.location::geometry) AS lon, ST_Y(l.location::geometry) AS lat, l.created_at
           FROM listings l LEFT JOIN users u ON u.id = l.owner_id
           WHERE l.is_hidden = false`
        );
        items = rows.filter((r: any) => r.lat != null && r.lon != null).map((r: any) => ({
          id: r.id, owner_id: r.owner_id, org_name: r.org_name || 'Facility', county: '',
          title: r.title, category: r.category || 'general', item: r.item || r.category || 'general',
          quantity: Number(r.quantity) || 1,
          is_urgent: !!r.is_urgent, kind: r.kind, lat: Number(r.lat), lon: Number(r.lon), created_at: r.created_at,
        }));
      } catch (e) {
        // fall through with empty
      } finally {
        client.release();
      }
    }

    const offers = items.filter((i) => i.kind === 'offer').map((o) => ({ ...o, remaining: o.quantity }));
    const requests = items.filter((i) => i.kind === 'request');

    // ---- Build facility nodes (aggregate per owner) ----
    const nodeMap = new Map<number, any>();
    for (const it of items) {
      let n = nodeMap.get(it.owner_id);
      if (!n) {
        n = { id: it.owner_id, org_name: it.org_name, county: it.county, lat: it.lat, lon: it.lon,
              offers: [], requests: [], surplusUnits: 0, needUnits: 0, urgent: false };
        nodeMap.set(it.owner_id, n);
      }
      if (it.kind === 'offer') { n.offers.push({ id: it.id, title: it.title, category: it.category, quantity: it.quantity }); n.surplusUnits += it.quantity; }
      else { n.requests.push({ id: it.id, title: it.title, category: it.category, quantity: it.quantity, urgent: it.is_urgent }); n.needUnits += it.quantity; if (it.is_urgent) n.urgent = true; }
    }
    const nodes = [...nodeMap.values()].map((n) => ({
      ...n, role: n.offers.length && n.requests.length ? 'mixed' : n.offers.length ? 'hub' : 'need',
    }));

    // ---- Triage order: urgent first, then most recent ----
    const ordered = [...requests].sort((a, b) =>
      (Number(b.is_urgent) - Number(a.is_urgent)) ||
      (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    );

    type Match = { req: Norm; off: typeof offers[number]; qty: number; distanceKm: number };
    const matches: Match[] = [];
    for (const req of ordered) {
      const reqKey = matchKey(req);
      const candidates = offers
        .filter((o) => matchKey(o) === reqKey && o.remaining > 0)
        .map((o) => ({ o, d: haversineKm(req, o) }))
        .sort((x, y) => x.d - y.d);
      if (!candidates.length) continue;
      const best = candidates[0];
      const qty = Math.min(req.quantity, best.o.remaining);
      best.o.remaining -= qty;
      matches.push({ req, off: best.o, qty, distanceKm: best.d });
    }

    // ---- Resolve geometry (roads via OSRM, arc fallback) ----
    const routes = await Promise.all(matches.map(async (m, idx) => {
      const from = { lat: m.off.lat, lon: m.off.lon };
      const to = { lat: m.req.lat, lon: m.req.lon };
      let geometry: [number, number][] | null = null;
      let distanceKm = m.distanceKm;
      let durationMin: number | null = null;
      let routed = false;
      if (useRoads) {
        const r = await osrmRoute(from, to);
        if (r) { geometry = r.coords; distanceKm = r.distanceKm; durationMin = r.durationMin; routed = true; }
      }
      if (!geometry) geometry = arc(from, to);
      return {
        id: idx + 1,
        item: m.req.title.replace(/ needed| urgently needed/i, '').trim(),
        category: m.req.category,
        qty: m.qty,
        urgent: m.req.is_urgent,
        routed,
        distance_km: Math.round(distanceKm),
        eta_min: durationMin != null ? Math.round(durationMin) : null,
        from: { id: m.off.owner_id, org: m.off.org_name, county: m.off.county, lat: from.lat, lon: from.lon, title: m.off.title },
        to: { id: m.req.owner_id, org: m.req.org_name, county: m.req.county, lat: to.lat, lon: to.lon, title: m.req.title },
        geometry,
      };
    }));

    // ---- Equity outcome: demand coverage and facilities lifted out of shortfall ----
    const demandUnits = requests.reduce((s, r) => s + r.quantity, 0);
    const urgentTotal = requests.filter((r) => r.is_urgent).length;
    const facilitiesInNeed = nodes.filter((n: any) => n.needUnits > 0).length;
    const unitsMoved = routes.reduce((s, r) => s + r.qty, 0);
    const facilitiesServed = new Set(routes.map((r) => r.to.id)).size;

    const impact = {
      routes: routes.length,
      facilities_served: facilitiesServed,
      hubs_engaged: new Set(routes.map((r) => r.from.id)).size,
      units_moved: unitsMoved,
      total_km: routes.reduce((s, r) => s + r.distance_km, 0),
      urgent_closed: routes.filter((r) => r.urgent).length,
      roads_used: routes.some((r) => r.routed),
      // equity outcome
      demand_units: demandUnits,
      coverage_pct: demandUnits ? Math.round((unitsMoved / demandUnits) * 100) : 0,
      facilities_in_need: facilitiesInNeed,
      facilities_unmet: Math.max(0, facilitiesInNeed - facilitiesServed),
      urgent_total: urgentTotal,
    };

    res.json({
      generated_at: new Date().toISOString(),
      scenario: {
        geography: 'Kenya',
        facility_data: 'Public facility names and approximate geocodes',
        inventory_data: 'Synthetic conference demonstration data',
        advisory: 'Coordinator verification required before any real-world transfer',
      },
      nodes,
      routes,
      impact,
    });
  } catch (err: any) {
    console.error('[redistribution] error:', err?.message || err);
    res.status(500).json({ error: 'failed to build redistribution plan' });
  }
}
