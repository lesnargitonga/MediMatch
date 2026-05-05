import { Request, Response } from 'express';
import { pool } from '../config/db';
import { fileDb } from '../db/fileDb';
import { mockDB } from '../mock/db';

export async function createMatch(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { listingId } = req.body;
  if (!listingId) return res.status(400).json({ error: 'listingId required' });

  const client = await pool.connect();
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const m = { id: mockDB.nextMatchId++, listing_id: Number(listingId), requester_id: userId, status: 'pending', created_at: new Date().toISOString() };
      mockDB.matches.push(m);
      return res.json(m);
    }
    if (process.env.USE_FILE_DB === 'true') {
      const m = fileDb.createMatch({ listing_id: Number(listingId), requester_id: userId });
      return res.json(m);
    }
    const { rows } = await client.query(
      'INSERT INTO matches (listing_id, requester_id) VALUES ($1,$2) RETURNING id,listing_id,requester_id,status,created_at',
      [listingId, userId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

/**
 * Suggest listings to match with, ranked by a professional multi-factor score.
 * GET /api/matches/suggest?lat=..&lon=..&category=..&max_km=50&limit=20
 * - Factors: distance (if lat/lon provided), urgency, reputation (avg and volume), recency, verification, category fit, quantity
 */
export async function suggestMatches(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });

  // Inputs
  const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
  const lon = req.query.lon != null ? Number(req.query.lon) : undefined;
  const category = (req.query.category as string | undefined)?.toLowerCase() || undefined;
  const maxKm = req.query.max_km != null ? Math.max(1, Number(req.query.max_km)) : 50; // default 50km window when distance used
  const limit = req.query.limit != null ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;

  const hasPoint = Number.isFinite(lat as any) && Number.isFinite(lon as any);
  // Recency decay lambda: ~0.0401 so 30 days ~= 0.30 score
  const recencyLambda = Math.log(1/0.3) / 30.0;

  const client = await pool.connect();
  try {
    const debug: any = { hasPoint, lat, lon, category, maxKm, limit };
    const params: any[] = [];
    let idx = 1;
    // Dynamically detect if listings.location column exists (PostGIS). If not, distance factors become 0.
  const locCheck = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='location'`);
  const hasLocationCol = (locCheck && typeof locCheck.rowCount === 'number' ? locCheck.rowCount : 0) > 0;
    debug.hasLocationCol = hasLocationCol;
    const pointExpr = hasPoint && hasLocationCol ? `ST_SetSRID(ST_MakePoint($${idx+1}, $${idx}), 4326)::geography` : 'NULL';
    if (hasPoint && hasLocationCol) { params.push(lat); params.push(lon); idx += 2; }
    params.push(maxKm); const maxKmIdx = idx; idx += 1;
    params.push(recencyLambda); const lambdaIdx = idx; idx += 1;
    params.push(category ?? null); const catIdx = idx; idx += 1;
    params.push(limit); const limitIdx = idx; idx += 1;

    // Build optional filters
  const distanceFilter = (hasPoint && hasLocationCol) ? `AND ST_DWithin(l.location, ${pointExpr}, $${maxKmIdx} * 1000)` : '';
    const categoryFilter = category ? `AND l.category = $${catIdx}` : '';

    const q = `
      WITH base AS (
        SELECT 
          l.id,
          l.owner_id,
          u.name as owner_name,
          u.org_name,
          u.org_verified,
          COALESCE(u.average_rating,0)::float8 AS average_rating,
          COALESCE(u.total_ratings,0)::int AS total_ratings,
          l.title,
          l.description,
          l.quantity,
          l.category,
          l.is_urgent,
          l.created_at,
          ${hasLocationCol ? `ST_AsText(l.location)` : `NULL`} AS location_wkt,
          ${hasPoint && hasLocationCol ? `ST_Distance(l.location, ${pointExpr})/1000.0` : `NULL`} AS distance_km
        FROM listings l
        LEFT JOIN users u ON u.id = l.owner_id
        WHERE l.is_hidden = false
          AND COALESCE(u.disabled, false) = false
          ${distanceFilter}
          ${categoryFilter}
        ORDER BY l.created_at DESC
        LIMIT 500
      )
      SELECT 
        b.*,
        -- Components (0..1)
        CASE 
          WHEN b.distance_km IS NULL THEN 0
          WHEN $${maxKmIdx} <= 0 THEN 0
          ELSE GREATEST(0, 1 - (b.distance_km / $${maxKmIdx}))
        END AS c_distance,
        CASE WHEN b.is_urgent THEN 1 ELSE 0 END AS c_urgency,
        (LEAST(5, GREATEST(0, b.average_rating)) / 5.0) * LEAST(1, LN(1 + b.total_ratings) / LN(21)) AS c_reputation,
        EXP( - (EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400.0) * $${lambdaIdx} ) AS c_recency,
        CASE WHEN b.org_verified THEN 1 ELSE 0 END AS c_verified,
        CASE WHEN $${catIdx} IS NOT NULL AND b.category = $${catIdx} THEN 1 ELSE 0 END AS c_category,
        LEAST(1, COALESCE(b.quantity,1)/10.0) AS c_quantity,
        -- Weighted score
        (
          0.35 * CASE WHEN b.distance_km IS NULL THEN 0 ELSE GREATEST(0, 1 - (b.distance_km / $${maxKmIdx})) END +
          0.20 * CASE WHEN b.is_urgent THEN 1 ELSE 0 END +
          0.20 * ((LEAST(5, GREATEST(0, b.average_rating)) / 5.0) * LEAST(1, LN(1 + b.total_ratings) / LN(21))) +
          0.15 * EXP( - (EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400.0) * $${lambdaIdx} ) +
          0.05 * CASE WHEN b.org_verified THEN 1 ELSE 0 END +
          0.04 * CASE WHEN $${catIdx} IS NOT NULL AND b.category = $${catIdx} THEN 1 ELSE 0 END +
          0.01 * LEAST(1, COALESCE(b.quantity,1)/10.0)
        ) AS score
      FROM base b
      ORDER BY score DESC, b.is_urgent DESC, b.created_at DESC
      LIMIT $${limitIdx};
    `;

    debug.paramOrder = params.map((_,i)=>i+1);
    if (process.env.DEBUG_SUGGEST === 'true') {
      console.log('[suggestMatches] Debug context:', debug);
      console.log('[suggestMatches] SQL snippet start:\n', q.slice(0, 400),'...');
    }
    let rows;
    try {
      const result = await client.query(q, params);
      rows = result.rows;
    } catch (queryErr:any) {
      // Fallback: run simplified query without any PostGIS usage if distance functions failed
      console.error('[suggestMatches] primary query failed:', queryErr?.message || queryErr);
      let simple: string;
      let simpleParams: any[];
      if (category) {
        simple = `SELECT l.id, l.owner_id, u.name as owner_name, l.title, l.description, l.quantity, l.category, l.is_urgent, l.created_at,
          COALESCE(u.average_rating,0)::float8 AS average_rating, COALESCE(u.total_ratings,0)::int AS total_ratings, u.org_verified, u.org_name,
          NULL::text AS location_wkt, NULL::float8 AS distance_km,
          CASE WHEN l.is_urgent THEN 1 ELSE 0 END AS c_urgency,
          (LEAST(5, GREATEST(0, COALESCE(u.average_rating,0))) / 5.0) * LEAST(1, LN(1 + COALESCE(u.total_ratings,0)) / LN(21)) AS c_reputation,
          EXP( - (EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400.0) * $1 ) AS c_recency,
          CASE WHEN u.org_verified THEN 1 ELSE 0 END AS c_verified,
          CASE WHEN $2 IS NOT NULL AND l.category = $2 THEN 1 ELSE 0 END AS c_category,
          LEAST(1, COALESCE(l.quantity,1)/10.0) AS c_quantity,
          (
            0.20 * CASE WHEN l.is_urgent THEN 1 ELSE 0 END +
            0.20 * ((LEAST(5, GREATEST(0, COALESCE(u.average_rating,0))) / 5.0) * LEAST(1, LN(1 + COALESCE(u.total_ratings,0)) / LN(21))) +
            0.15 * EXP( - (EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400.0) * $1 ) +
            0.05 * CASE WHEN u.org_verified THEN 1 ELSE 0 END +
            0.04 * CASE WHEN $2 IS NOT NULL AND l.category = $2 THEN 1 ELSE 0 END +
            0.01 * LEAST(1, COALESCE(l.quantity,1)/10.0)
          ) AS score,
          0 AS c_distance
          FROM listings l LEFT JOIN users u ON u.id = l.owner_id
          WHERE l.is_hidden = false AND COALESCE(u.disabled,false)=false AND l.category = $2
          ORDER BY score DESC, l.is_urgent DESC, l.created_at DESC
          LIMIT $3`;
        simpleParams = [recencyLambda, category, limit];
      } else {
        simple = `SELECT l.id, l.owner_id, u.name as owner_name, l.title, l.description, l.quantity, l.category, l.is_urgent, l.created_at,
          COALESCE(u.average_rating,0)::float8 AS average_rating, COALESCE(u.total_ratings,0)::int AS total_ratings, u.org_verified, u.org_name,
          NULL::text AS location_wkt, NULL::float8 AS distance_km,
          CASE WHEN l.is_urgent THEN 1 ELSE 0 END AS c_urgency,
          (LEAST(5, GREATEST(0, COALESCE(u.average_rating,0))) / 5.0) * LEAST(1, LN(1 + COALESCE(u.total_ratings,0)) / LN(21)) AS c_reputation,
          EXP( - (EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400.0) * $1 ) AS c_recency,
          CASE WHEN u.org_verified THEN 1 ELSE 0 END AS c_verified,
          0 AS c_category,
          LEAST(1, COALESCE(l.quantity,1)/10.0) AS c_quantity,
          (
            0.20 * CASE WHEN l.is_urgent THEN 1 ELSE 0 END +
            0.20 * ((LEAST(5, GREATEST(0, COALESCE(u.average_rating,0))) / 5.0) * LEAST(1, LN(1 + COALESCE(u.total_ratings,0)) / LN(21))) +
            0.15 * EXP( - (EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400.0) * $1 ) +
            0.05 * CASE WHEN u.org_verified THEN 1 ELSE 0 END +
            0.01 * LEAST(1, COALESCE(l.quantity,1)/10.0)
          ) AS score,
          0 AS c_distance
          FROM listings l LEFT JOIN users u ON u.id = l.owner_id
          WHERE l.is_hidden = false AND COALESCE(u.disabled,false)=false
          ORDER BY score DESC, l.is_urgent DESC, l.created_at DESC
          LIMIT $2`;
        simpleParams = [recencyLambda, limit];
      }
      try {
        const simpleRes = await client.query(simple, simpleParams);
        rows = simpleRes.rows;
        console.warn('[suggestMatches] Using simplified fallback (no distance).');
      } catch (fallbackErr:any) {
        console.error('[suggestMatches] fallback query failed:', fallbackErr?.message || fallbackErr);
        return res.status(500).json({ error: 'server error', details: process.env.DEBUG_SUGGEST==='true' ? (fallbackErr?.message || String(fallbackErr)) : undefined });
      }
    }
    return res.json({ suggestions: rows, meta: { fallback: rows && rows.length>0 && rows[0].c_distance===0 && hasPoint && 'distance-disabled' } });
  } catch (err:any) {
    console.error('suggestMatches error:', err?.message || err);
    return res.status(500).json({ error: 'server error', details: process.env.DEBUG_SUGGEST==='true' ? (err?.message || String(err)) : undefined });
  } finally {
    client.release();
  }
}
