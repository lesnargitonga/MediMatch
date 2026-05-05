import { Router } from 'express';
import { requireAdmin } from '../middleware/admin.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { pool } from '../config/db';

const router = Router();

// Test route to verify admin router is working
router.get('/test', (req, res) => res.json({ ok: true }));

router.use(authMiddleware, requireAdmin);

router.get('/stats', async (_req, res) => {
  try {
    const q = `SELECT 
      (SELECT COUNT(*)::int FROM users) as users,
      (SELECT COUNT(*)::int FROM listings) as listings,
      (SELECT COUNT(*)::int FROM matches) as matches`;
    const { rows } = await pool.query(q);
    return res.json(rows[0]);
  } catch { return res.status(500).json({ error: 'server error' }); }
});

// Admin reports (JSON summary)
router.get('/reports/summary', async (_req, res) => {
  try {
    const usersRes = await pool.query(`SELECT COUNT(*)::int AS total_users FROM users`);
    const adminsRes = await pool.query(`SELECT COUNT(*)::int AS admin_users FROM users WHERE role='admin'`);
    const disabledRes = await pool.query(`SELECT COUNT(*)::int AS disabled_users FROM users WHERE disabled=TRUE`);
    const verifiedRes = await pool.query(`SELECT COUNT(*)::int AS verified_orgs FROM users WHERE org_verified=TRUE`);
    const listingsRes = await pool.query(`SELECT COUNT(*)::int AS total_listings, COALESCE(SUM((is_urgent)::int),0)::int AS urgent_listings FROM listings`);
    const hiddenListingsRes = await pool.query(`SELECT COUNT(*)::int AS hidden_listings FROM listings WHERE is_hidden=TRUE`);
    const byCatRes = await pool.query(`SELECT COALESCE(category,'unknown') AS category, COUNT(*)::int AS count FROM listings GROUP BY 1 ORDER BY 2 DESC`);
    const last7Res = await pool.query(`SELECT COUNT(*)::int AS last_7_days FROM listings WHERE created_at >= NOW() - INTERVAL '7 days'`);
    const last30Res = await pool.query(`SELECT COUNT(*)::int AS last_30_days FROM listings WHERE created_at >= NOW() - INTERVAL '30 days'`);
    const matches7Res = await pool.query(`SELECT COUNT(*)::int AS matches_last_7 FROM matches WHERE created_at >= NOW() - INTERVAL '7 days'`);
    const matches30Res = await pool.query(`SELECT COUNT(*)::int AS matches_last_30 FROM matches WHERE created_at >= NOW() - INTERVAL '30 days'`);
    let messages7 = 0, messages30 = 0;
    try {
      const m7 = await pool.query(`SELECT COUNT(*)::int AS c FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'`);
      const m30 = await pool.query(`SELECT COUNT(*)::int AS c FROM messages WHERE created_at >= NOW() - INTERVAL '30 days'`);
      messages7 = m7.rows[0]?.c ?? 0; messages30 = m30.rows[0]?.c ?? 0;
    } catch {}

    return res.json({
      totals: {
        users: usersRes.rows[0]?.total_users ?? 0,
        admin_users: adminsRes.rows[0]?.admin_users ?? 0,
        disabled_users: disabledRes.rows[0]?.disabled_users ?? 0,
        verified_orgs: verifiedRes.rows[0]?.verified_orgs ?? 0,
        listings: listingsRes.rows[0]?.total_listings ?? 0,
        urgent_listings: listingsRes.rows[0]?.urgent_listings ?? 0,
        hidden_listings: hiddenListingsRes.rows[0]?.hidden_listings ?? 0,
      },
      recent: {
        last_7_days: last7Res.rows[0]?.last_7_days ?? 0,
        last_30_days: last30Res.rows[0]?.last_30_days ?? 0,
        matches_last_7: matches7Res.rows[0]?.matches_last_7 ?? 0,
        matches_last_30: matches30Res.rows[0]?.matches_last_30 ?? 0,
        messages_last_7: messages7,
        messages_last_30: messages30,
      },
      listings_by_category: byCatRes.rows,
    });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
});

// Admin reports (CSV download)
router.get('/reports/summary.csv', async (_req, res) => {
  try {
    const usersRes = await pool.query(`SELECT COUNT(*)::int AS total_users FROM users`);
    const adminsRes = await pool.query(`SELECT COUNT(*)::int AS admin_users FROM users WHERE role='admin'`);
    const disabledRes = await pool.query(`SELECT COUNT(*)::int AS disabled_users FROM users WHERE disabled=TRUE`);
    const verifiedRes = await pool.query(`SELECT COUNT(*)::int AS verified_orgs FROM users WHERE org_verified=TRUE`);
    const listingsRes = await pool.query(`SELECT COUNT(*)::int AS total_listings, COALESCE(SUM((is_urgent)::int),0)::int AS urgent_listings FROM listings`);
    const hiddenListingsRes = await pool.query(`SELECT COUNT(*)::int AS hidden_listings FROM listings WHERE is_hidden=TRUE`);
    const byCatRes = await pool.query(`SELECT COALESCE(category,'unknown') AS category, COUNT(*)::int AS count FROM listings GROUP BY 1 ORDER BY 2 DESC`);
    const last7Res = await pool.query(`SELECT COUNT(*)::int AS last_7_days FROM listings WHERE created_at >= NOW() - INTERVAL '7 days'`);
    const last30Res = await pool.query(`SELECT COUNT(*)::int AS last_30_days FROM listings WHERE created_at >= NOW() - INTERVAL '30 days'`);
    const matches7Res = await pool.query(`SELECT COUNT(*)::int AS matches_last_7 FROM matches WHERE created_at >= NOW() - INTERVAL '7 days'`);
    const matches30Res = await pool.query(`SELECT COUNT(*)::int AS matches_last_30 FROM matches WHERE created_at >= NOW() - INTERVAL '30 days'`);
    let messages7 = 0, messages30 = 0;
    try {
      const m7 = await pool.query(`SELECT COUNT(*)::int AS c FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'`);
      const m30 = await pool.query(`SELECT COUNT(*)::int AS c FROM messages WHERE created_at >= NOW() - INTERVAL '30 days'`);
      messages7 = m7.rows[0]?.c ?? 0; messages30 = m30.rows[0]?.c ?? 0;
    } catch {}

    const lines: string[] = [];
    lines.push('metric,value');
    lines.push(`total_users,${usersRes.rows[0]?.total_users ?? 0}`);
    lines.push(`admin_users,${adminsRes.rows[0]?.admin_users ?? 0}`);
    lines.push(`disabled_users,${disabledRes.rows[0]?.disabled_users ?? 0}`);
    lines.push(`verified_orgs,${verifiedRes.rows[0]?.verified_orgs ?? 0}`);
    lines.push(`total_listings,${listingsRes.rows[0]?.total_listings ?? 0}`);
    lines.push(`urgent_listings,${listingsRes.rows[0]?.urgent_listings ?? 0}`);
    lines.push(`hidden_listings,${hiddenListingsRes.rows[0]?.hidden_listings ?? 0}`);
    lines.push(`last_7_days,${last7Res.rows[0]?.last_7_days ?? 0}`);
    lines.push(`last_30_days,${last30Res.rows[0]?.last_30_days ?? 0}`);
    lines.push(`matches_last_7,${matches7Res.rows[0]?.matches_last_7 ?? 0}`);
    lines.push(`matches_last_30,${matches30Res.rows[0]?.matches_last_30 ?? 0}`);
    lines.push(`messages_last_7,${messages7}`);
    lines.push(`messages_last_30,${messages30}`);
    for (const r of byCatRes.rows) {
      lines.push(`category_${String(r.category).replace(/[,\n\r]/g,' ')},${r.count}`);
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="summary.csv"');
    return res.send(csv);
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,email,name,role,org_name,org_type,org_license_id,org_verified,created_at FROM users ORDER BY created_at DESC LIMIT 200');
    return res.json(rows);
  } catch { return res.status(500).json({ error: 'server error' }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const actorId = Number((req as any).userId);
    const { role, org_verified, disabled } = req.body || {};
    if (!Number.isFinite(targetId)) return res.status(400).json({ error: 'invalid id' });
    if (role && !['user','admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });

    // Fetch target user
    const { rows: trows } = await pool.query(
      'SELECT id, role, disabled, COALESCE(TRIM(org_name), \'\') AS org_name, COALESCE(TRIM(org_type), \'\') AS org_type FROM users WHERE id=$1',
      [targetId]
    );
    const target = trows[0];
    if (!target) return res.status(404).json({ error: 'user not found' });

    // Block self-disable and self-demote to avoid accidental lockout
    if (actorId === targetId) {
      if (typeof disabled === 'boolean' && disabled === true) {
        return res.status(400).json({ error: 'you cannot disable your own account' });
      }
      if (role && role !== target.role) {
        return res.status(400).json({ error: 'you cannot change your own role' });
      }
    }

    // Prevent removing the last active admin
    if ((role === 'user' && target.role === 'admin') || (typeof disabled === 'boolean' && disabled === true && target.role === 'admin')) {
      const { rows: arows } = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE role='admin' AND disabled=FALSE`);
      const adminCount: number = arows[0]?.c ?? 0;
      if (adminCount <= 1) return res.status(400).json({ error: 'cannot remove the last admin' });
    }

    // Require org fields before verifying
    if (typeof org_verified === 'boolean' && org_verified === true) {
      const { rows: t2 } = await pool.query(
        'SELECT COALESCE(TRIM(org_name),\'\') AS org_name, COALESCE(TRIM(org_type),\'\') AS org_type, COALESCE(TRIM(org_license_id),\'\') AS org_license_id FROM users WHERE id=$1',
        [targetId]
      );
      const info = t2[0] || {};
      if (!info.org_name || !info.org_type || !info.org_license_id) {
        return res.status(400).json({ error: 'provide org_name, org_type, and org_license_id before verification' });
      }
    }

    const sets: string[] = []; const params: any[] = []; let i = 1;
    if (role) { sets.push(`role=$${i++}`); params.push(role); }
    if (typeof org_verified === 'boolean') { sets.push(`org_verified=$${i++}`); params.push(org_verified); }
    if (typeof disabled === 'boolean') { sets.push(`disabled=$${i++}`); params.push(disabled); }
    if (!sets.length) return res.json({ ok: true });
    params.push(targetId);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id=$${i}`;
    await pool.query(sql, params);
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ error: 'server error' }); }
});

router.get('/listings', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, owner_id, title, category, quantity, is_hidden, ST_AsText(location) as location_wkt, created_at FROM listings ORDER BY created_at DESC LIMIT 200');
    return res.json(rows);
  } catch { return res.status(500).json({ error: 'server error' }); }
});

router.delete('/listings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    await pool.query('DELETE FROM listings WHERE id=$1', [id]);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: 'server error' }); }
});

router.delete('/listings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    await pool.query('DELETE FROM listings WHERE id=$1', [id]);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: 'server error' }); }
});

router.put('/listings/:id/hide', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { is_hidden } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    await pool.query('UPDATE listings SET is_hidden=COALESCE($1,is_hidden) WHERE id=$2', [is_hidden === true, id]);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: 'server error' }); }
});

export default router;
