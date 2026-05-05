import { Request, Response } from 'express';
import { pool } from '../config/db';

/**
 * Get all notifications for the current user
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, unread_only } = req.query;

    let query = `
      SELECT 
        n.*,
        u.name as related_user_name
      FROM notifications n
      LEFT JOIN users u ON n.related_user_id = u.id
      WHERE n.user_id = $1
    `;

    const params: any[] = [userId];

    if (unread_only === 'true') {
      query += ' AND n.is_read = false';
    }

    query += ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    console.log(`[NOTIFICATIONS] Fetched ${result.rows.length} notifications for user ${userId}`);
    
    res.json({ notifications: result.rows });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    const count = parseInt(result.rows[0].count) || 0;
    console.log(`[NOTIFICATIONS] User ${userId} has ${count} unread notifications`);
    
    res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const check = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create a notification (helper function for internal use)
 */
export async function createNotification(data: {
  user_id: number;
  type: 'message' | 'rating' | 'listing_saved' | 'system';
  title: string;
  message: string;
  link?: string;
  related_user_id?: number;
  related_listing_id?: number;
  related_message_id?: number;
}) {
  try {
    console.log('[NOTIFICATION] Creating notification:', {
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message
    });
    
    const result = await pool.query(
      `INSERT INTO notifications 
        (user_id, type, title, message, link, related_user_id, related_listing_id, related_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.user_id,
        data.type,
        data.title,
        data.message,
        data.link || null,
        data.related_user_id || null,
        data.related_listing_id || null,
        data.related_message_id || null,
      ]
    );
    
    console.log('[NOTIFICATION] Created successfully:', result.rows[0].id);
    return result.rows[0];
  } catch (error: any) {
    console.error('[NOTIFICATION] Create error:', error);
    throw error;
  }
}
