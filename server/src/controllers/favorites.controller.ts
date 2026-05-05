import { Request, Response } from 'express';
import { pool } from '../config/db';
import { createNotification } from './notifications.controller';

/**
 * Save/favorite a listing
 */
export async function saveListing(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { listing_id } = req.body;
    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    // Check if already saved
    const existing = await pool.query(
      'SELECT id FROM saved_listings WHERE user_id = $1 AND listing_id = $2',
      [userId, listing_id]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, message: 'Already saved' });
    }

    // Get listing owner
    const listing = await pool.query(
      'SELECT owner_id, title FROM listings WHERE id = $1',
      [listing_id]
    );

    if (listing.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const ownerId = listing.rows[0].owner_id;
    const listingTitle = listing.rows[0].title;

    // Save the listing
    await pool.query(
      'INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, listing_id]
    );

    // Notify listing owner (if not saving own listing)
    if (ownerId !== userId) {
      const saverName = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      await createNotification({
        user_id: ownerId,
        type: 'listing_saved',
        title: 'Listing saved',
        message: `${saverName.rows[0]?.name || 'Someone'} saved your listing "${listingTitle}"`,
        link: `/listings/${listing_id}`,
        related_user_id: userId,
        related_listing_id: listing_id,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Save listing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Unsave/unfavorite a listing
 */
export async function unsaveListing(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { listing_id } = req.params;

    await pool.query(
      'DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2',
      [userId, listing_id]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Unsave listing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's saved listings
 */
export async function getSavedListings(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT listing_id FROM saved_listings WHERE user_id = $1',
      [userId]
    );

    const listingIds = result.rows.map(row => row.listing_id);
    res.json({ listing_ids: listingIds });
  } catch (error: any) {
    console.error('Get saved listings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
