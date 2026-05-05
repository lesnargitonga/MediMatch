import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RatingCreateSchema } from '../validation/schemas';
import { createNotification } from './notifications.controller';

/**
 * Submit a rating for another user
 */
export async function createRating(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = RatingCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn('[RATING] Validation failed', parsed.error.issues);
      return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
    }

    const { to_user_id, listing_id, rating, review_text } = parsed.data;
    console.log('[RATING] Incoming', { from: userId, to: to_user_id, listing_id, rating });

    // Prevent self-rating
    if (to_user_id === userId) {
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    // Check if target user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [to_user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert or update rating (upsert to allow editing)
    const insertQuery = `
      INSERT INTO ratings (from_user_id, to_user_id, listing_id, rating, review_text)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_user_id, to_user_id, listing_id)
      DO UPDATE SET rating = $4, review_text = $5, created_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [userId, to_user_id, listing_id || null, rating, review_text || null]);
  console.log('[RATING] Upserted row id', result.rows[0]?.id);

    // Recalculate average rating for the target user
    const statsQuery = `
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings
      FROM ratings
      WHERE to_user_id = $1
    `;
    const stats = await pool.query(statsQuery, [to_user_id]);
    const avgRating = parseFloat(stats.rows[0].avg_rating) || 0;
    const totalRatings = parseInt(stats.rows[0].total_ratings) || 0;

    // Update user's reputation fields
    await pool.query(
      'UPDATE users SET average_rating = $1, total_ratings = $2 WHERE id = $3',
      [avgRating.toFixed(2), totalRatings, to_user_id]
    );
    console.log('[RATING] Updated stats', { to_user_id, avgRating: avgRating.toFixed(2), totalRatings });

    // Create notification for rated user
    const raterName = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    await createNotification({
      user_id: to_user_id,
      type: 'rating',
      title: 'New rating received',
      message: `${raterName.rows[0]?.name || 'Someone'} rated you ${rating} star${rating !== 1 ? 's' : ''}`,
      link: '/dashboard?tab=account',
      related_user_id: userId,
      related_listing_id: listing_id,
    });

    res.json({ 
      success: true, 
      rating: result.rows[0],
      new_stats: { average_rating: avgRating.toFixed(2), total_ratings: totalRatings }
    });
  } catch (error: any) {
    console.error('Create rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get ratings for a specific user (received ratings)
 */
export async function getUserRatings(req: Request, res: Response) {
  try {
    const { user_id } = req.params;

    const query = `
      SELECT 
        r.*,
        u.name as from_user_name,
        u.org_name as from_org_name
      FROM ratings r
      LEFT JOIN users u ON r.from_user_id = u.id
      WHERE r.to_user_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [user_id]);

    res.json({ ratings: result.rows });
  } catch (error: any) {
    console.error('Get user ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get reputation summary for a user
 */
export async function getUserReputation(req: Request, res: Response) {
  try {
    const { user_id } = req.params;

    const query = `
      SELECT 
        id,
        name,
        org_name,
        org_verified,
        average_rating,
        total_ratings
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ reputation: result.rows[0] });
  } catch (error: any) {
    console.error('Get user reputation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if current user can rate a specific user
 */
export async function canRateUser(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id } = req.params;
    const { listing_id } = req.query;

    // Check if user has already rated this user for this listing
    const query = `
      SELECT id FROM ratings
      WHERE from_user_id = $1 AND to_user_id = $2 AND listing_id IS NOT DISTINCT FROM $3
    `;
    const result = await pool.query(query, [userId, user_id, listing_id || null]);

    res.json({ 
      can_rate: result.rows.length === 0,
      existing_rating: result.rows[0] || null
    });
  } catch (error: any) {
    console.error('Can rate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
