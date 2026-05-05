import { Request, Response } from 'express';
import { pool } from '../config/db';
import { createNotification } from './notifications.controller';

/**
 * Get or create a conversation between two users
 * POST /api/chat/conversations
 * Body: { otherUserId: number }
 */
export async function getOrCreateConversation(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const { otherUserId, listingId } = req.body; // listingId optional; if provided we scope conversation to that listing

  if (!otherUserId || isNaN(Number(otherUserId))) {
    return res.status(400).json({ error: 'otherUserId is required' });
  }

  const otherUserIdNum = Number(otherUserId);
  if (otherUserIdNum === userId) {
    return res.status(400).json({ error: 'Cannot create conversation with yourself' });
  }

  const client = await pool.connect();
  try {
    // Use normalized participant ordering and new columns to find conversation deterministically
    const aId = Math.min(userId, otherUserIdNum);
    const bId = Math.max(userId, otherUserIdNum);
    const listingParam = listingId ? Number(listingId) : null;

    const existingConv = await client.query(
      `SELECT id, created_at, listing_id
       FROM conversations
       WHERE user_a_id = $1 AND user_b_id = $2 AND (($3::INT IS NULL AND listing_id IS NULL) OR listing_id = $3)
       LIMIT 1`,
      [aId, bId, listingParam]
    );

    if (existingConv.rows.length > 0) {
      return res.json({ conversation: existingConv.rows[0] });
    }

    // Create new conversation (handle unique race with ON CONFLICT via unique index)
    let newConv;
    try {
      newConv = await client.query(
        `INSERT INTO conversations (listing_id, user_a_id, user_b_id)
         VALUES ($1, $2, $3)
         RETURNING id, created_at, listing_id`,
        [listingParam, aId, bId]
      );
    } catch (e: any) {
      // Unique constraint hit: someone else created it concurrently, fetch it
      if (e?.code === '23505') {
        const fallback = await client.query(
          `SELECT id, created_at, listing_id
           FROM conversations
           WHERE user_a_id = $1 AND user_b_id = $2 AND (($3::INT IS NULL AND listing_id IS NULL) OR listing_id = $3)
           LIMIT 1`,
          [aId, bId, listingParam]
        );
        if (fallback.rows.length > 0) {
          return res.json({ conversation: fallback.rows[0] });
        }
        throw e;
      }
      throw e;
    }
    const conversationId = newConv.rows[0].id;

    // Add both participants (idempotent)
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [conversationId, userId]
    );
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [conversationId, otherUserIdNum]
    );

    // Notify the other user that someone started a conversation
    const initiatorName = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
    await createNotification({
      user_id: otherUserIdNum,
      type: 'message',
      title: 'New conversation',
      message: `${initiatorName.rows[0]?.name || 'Someone'} started a conversation with you`,
      link: '/dashboard?tab=messages',
      related_user_id: userId,
    });

  return res.json({ conversation: newConv.rows[0] });
  } catch (err) {
    console.error('getOrCreateConversation error:', err);
    return res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

/**
 * Get all conversations for the current user
 * GET /api/chat/conversations
 */
export async function getConversations(req: Request, res: Response) {
  const userId = Number((req as any).userId);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT DISTINCT c.id, c.created_at, c.listing_id,
        (SELECT l.title FROM listings l WHERE l.id = c.listing_id) AS listing_title,
        (SELECT u.id FROM users u
         INNER JOIN conversation_participants cp ON cp.user_id = u.id
         WHERE cp.conversation_id = c.id AND u.id != $1
         LIMIT 1) as other_user_id,
        (SELECT u.name FROM users u
         INNER JOIN conversation_participants cp ON cp.user_id = u.id
         WHERE cp.conversation_id = c.id AND u.id != $1
         LIMIT 1) as other_user_name,
        (SELECT u.email FROM users u
         INNER JOIN conversation_participants cp ON cp.user_id = u.id
         WHERE cp.conversation_id = c.id AND u.id != $1
         LIMIT 1) as other_user_email,
        (SELECT m.content FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    return res.json({ conversations: result.rows });
  } catch (err) {
    console.error('getConversations error:', err);
    return res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

/**
 * Get messages in a conversation
 * GET /api/chat/conversations/:conversationId/messages
 */
export async function getMessages(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const conversationId = Number(req.params.conversationId);

  if (!conversationId || isNaN(conversationId)) {
    return res.status(400).json({ error: 'invalid conversation id' });
  }

  const client = await pool.connect();
  try {
    // Verify user is participant
    const participant = await client.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'not a participant' });
    }

    // Fetch messages
    const messages = await client.query(
      `SELECT m.id, m.sender_id, m.content, m.created_at,
        u.name as sender_name, u.email as sender_email
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    return res.json({ messages: messages.rows });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}

/**
 * Send a message in a conversation
 * POST /api/chat/conversations/:conversationId/messages
 * Body: { content: string }
 */
export async function sendMessage(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const conversationId = Number(req.params.conversationId);
  const { content } = req.body;

  if (!conversationId || isNaN(conversationId)) {
    return res.status(400).json({ error: 'invalid conversation id' });
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'message too long (max 2000 characters)' });
  }

  const client = await pool.connect();
  try {
    // Verify user is participant
    const participant = await client.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'not a participant' });
    }

    // Insert message
    const message = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [conversationId, userId, content.trim()]
    );

    // Get other participant to send notification
    const otherParticipant = await client.query(
      `SELECT user_id, (SELECT name FROM users WHERE id = user_id) as user_name
       FROM conversation_participants 
       WHERE conversation_id = $1 AND user_id != $2
       LIMIT 1`,
      [conversationId, userId]
    );

    // Fetch listing_id for notification context
    const convRow = await client.query(`SELECT listing_id FROM conversations WHERE id = $1`, [conversationId]);
    const convListingId = convRow.rows[0]?.listing_id || null;

    if (otherParticipant.rows.length > 0) {
      const recipientId = otherParticipant.rows[0].user_id;
      const senderName = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
      
      // Create notification for recipient
      await createNotification({
        user_id: recipientId,
        type: 'message',
        title: 'New message',
        message: `${senderName.rows[0]?.name || 'Someone'} sent you a message`,
        link: '/dashboard?tab=messages',
        related_user_id: userId,
        related_message_id: message.rows[0].id,
        related_listing_id: convListingId,
      });
    }

    return res.json({ message: message.rows[0] });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'server error' });
  } finally {
    client.release();
  }
}
