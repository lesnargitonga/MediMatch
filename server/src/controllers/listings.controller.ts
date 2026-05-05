import { Request, Response } from 'express';
import { pool } from '../config/db';
import { mockDB } from '../mock/db';
import { fileDb } from '../db/fileDb';
import { ListingCategories, ListingCreateSchema, ListingUpdateSchema } from '../validation/schemas';
import { createNotification } from './notifications.controller';

export async function getListings(req: Request, res: Response) {
  const qCategory = (req.query.category as string | undefined)?.toLowerCase();
  const validCategory = qCategory && (ListingCategories as readonly string[]).includes(qCategory) ? qCategory : undefined;
  if (process.env.USE_MOCK_DB === 'true') {
    const filtered = validCategory ? mockDB.listings.filter((l:any)=> (l.category||'general')===validCategory) : mockDB.listings;
    return res.json(filtered.map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      quantity: l.quantity,
      category: l.category || 'general',
      location_wkt: l.location_wkt,
      created_at: l.created_at
    })));
  }

  if (process.env.USE_FILE_DB === 'true') {
    const list = fileDb.getListings();
    const rows = validCategory ? list.filter((l:any)=> (l.category||'general')===validCategory) : list;
    return res.json(rows);
  }

  const client = await pool.connect();
  try {
    // Detect if PostGIS geography column "location" exists; build query accordingly.
    const locCol = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='location'`
    );
  const hasLocation = (locCol && typeof locCol.rowCount === 'number' ? locCol.rowCount : 0) > 0;
    const params: any[] = [];
    let selectCols = 'l.id, l.owner_id, u.name as owner_name, u.email as owner_email, l.title, l.description, l.quantity, l.category, l.is_urgent, l.created_at';
    // If a geography column exists, return WKT for client mapping; else fallback null
    if (hasLocation) {
      selectCols = 'l.id, l.owner_id, u.name as owner_name, u.email as owner_email, u.average_rating, u.total_ratings, u.org_verified, u.org_name, l.title, l.description, l.quantity, l.category, l.is_urgent, ST_AsText(l.location) as location_wkt, l.created_at';
    }
    let sql = `SELECT ${selectCols} FROM listings l LEFT JOIN users u ON l.owner_id = u.id WHERE l.is_hidden = false`;
    if (validCategory) { params.push(validCategory); sql += ' AND l.category = $1'; }
    sql += ' ORDER BY l.created_at DESC LIMIT 100';
    const { rows } = await client.query(sql, params);
    // If location column missing, ensure consistent shape adding location_wkt null
    const normalized = hasLocation ? rows : rows.map(r => ({ ...r, location_wkt: null }));
    res.json(normalized);
  } catch (err: any) {
    // log full error for debugging DB/SQL issues
    console.error('getListings error:', err?.message || err, err?.stack || 'no stack');
    res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

export async function createListing(req: Request, res: Response) {
  let userId = (req as any).userId;
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    if (!isNaN(parsed)) userId = parsed;
  }
  // Optional policy: disallow admins from creating listings in certain deployments
  if (process.env.DISALLOW_ADMIN_LISTINGS === 'true') {
    try {
      const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
      const role = rows[0]?.role || 'user';
      if (role === 'admin') return res.status(403).json({ error: 'admins are not allowed to create listings' });
    } catch {
      // if role lookup fails, fail closed to be safe
      return res.status(403).json({ error: 'policy denied' });
    }
  }
  const parse = ListingCreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message || 'invalid input' });
  const { title, description, quantity, category, is_urgent } = parse.data as any;
  let lat = (parse.data as any).lat;
  let lon = (parse.data as any).lon;
  if (parse.data && (parse.data as any).location) { lat = (parse.data as any).location.lat; lon = (parse.data as any).location.lon; }
  if (process.env.USE_MOCK_DB === 'true') {
    const l = {
      id: mockDB.nextListingId++,
      owner_id: userId,
      title,
      description: description || null,
      quantity: quantity || 1,
      category: category || 'general',
      location_wkt: `POINT(${lon} ${lat})`,
      created_at: new Date().toISOString()
    };
    mockDB.listings.unshift(l);
    return res.json({ id: l.id, title: l.title, description: l.description, quantity: l.quantity, category: l.category, created_at: l.created_at });
  }

  if (process.env.USE_FILE_DB === 'true') {
    const l = fileDb.createListing({ owner_id: userId, title, description, quantity, category: category || 'general', lon, lat });
    return res.json({ id: l.id, title: l.title, description: l.description, quantity: l.quantity, category: l.category, created_at: l.created_at });
  }

  const client = await pool.connect();
  try {
  const q = `INSERT INTO listings (owner_id, title, description, quantity, category, is_urgent, location) VALUES ($1,$2,$3,$4,$5,$6, ST_SetSRID(ST_MakePoint($7,$8),4326)::geography) RETURNING id,title,description,quantity,category,is_urgent,created_at`;
  const { rows } = await client.query(q, [userId, title, description || null, quantity || 1, category || 'general', is_urgent || false, lon, lat]);
    
    const listingId = rows[0].id;
    const creatorName = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
    const name = creatorName.rows[0]?.name || 'Someone';

    console.log('[LISTING] Created listing:', { listingId, userId, title, is_urgent });

    // Notify all admins about new listings
    const admins = await client.query('SELECT id FROM users WHERE role = $1', ['admin']);
    console.log('[LISTING] Found admins:', admins.rows.map(a => a.id));
    
    for (const admin of admins.rows) {
      if (admin.id !== userId) {
        console.log('[LISTING] Notifying admin:', admin.id);
        await createNotification({
          user_id: admin.id,
          type: 'system',
          title: 'New listing created',
          message: `${name} created "${title}"${is_urgent ? ' (URGENT)' : ''}`,
          link: `/listings/${listingId}`,
          related_user_id: userId,
          related_listing_id: listingId,
        });
      } else {
        console.log('[LISTING] Skipping self-notification for admin:', admin.id);
      }
    }

    // If urgent, notify all users (not just admins)
    if (is_urgent) {
      const allUsers = await client.query('SELECT id FROM users WHERE id != $1', [userId]);
      for (const userRow of allUsers.rows) {
        // Skip if already notified (admins)
        const isAdmin = admins.rows.some(a => a.id === userRow.id);
        if (!isAdmin) {
          await createNotification({
            user_id: userRow.id,
            type: 'system',
            title: '🔥 Urgent listing nearby',
            message: `${name} posted an urgent need: "${title}"`,
            link: `/listings/${listingId}`,
            related_user_id: userId,
            related_listing_id: listingId,
          });
        }
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

export async function updateListing(req: Request, res: Response) {
  const userId = (req as any).userId;
  const id = Number(req.params.id);
  const parse = ListingUpdateSchema.safeParse({ id, ...req.body });
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message || 'invalid input' });
  const { title, description, quantity, category } = parse.data as any;

  if (process.env.USE_MOCK_DB === 'true') {
    const idx = mockDB.listings.findIndex((l: any) => l.id === id && l.owner_id === userId);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    const l = mockDB.listings[idx];
    mockDB.listings[idx] = { ...l, title: title ?? l.title, description: description ?? l.description, quantity: quantity ?? l.quantity, category: category ?? l.category };
    return res.json(mockDB.listings[idx]);
  }

  if (process.env.USE_FILE_DB === 'true') {
    const l = fileDb.updateListing({ id, owner_id: userId, title, description, quantity, category });
    if (!l) return res.status(404).json({ error: 'not found' });
    return res.json(l);
  }

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query('UPDATE listings SET title=COALESCE($1,title), description=COALESCE($2,description), quantity=COALESCE($3,quantity), category=COALESCE($4,category) WHERE id=$5 AND owner_id=$6', [title ?? null, description ?? null, quantity ?? null, category ?? null, id, userId]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    const { rows } = await client.query('SELECT id, title, description, quantity, category, ST_AsText(location) as location_wkt, created_at FROM listings WHERE id=$1', [id]);
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

export async function deleteListing(req: Request, res: Response) {
  const userId = (req as any).userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

  if (process.env.USE_MOCK_DB === 'true') {
    const before = mockDB.listings.length;
    mockDB.listings = mockDB.listings.filter((l: any) => !(l.id === id && l.owner_id === userId));
    if (mockDB.listings.length === before) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  }

  if (process.env.USE_FILE_DB === 'true') {
    const ok = fileDb.deleteListing({ id, owner_id: userId });
    if (!ok) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  }

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query('DELETE FROM listings WHERE id=$1 AND owner_id=$2', [id, userId]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}
