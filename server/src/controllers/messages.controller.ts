import { Request, Response } from 'express';
import { fileDb } from '../db/fileDb';
import { mockDB } from '../mock/db';
import { pool } from '../config/db';

export async function listMessages(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isFinite(listingId)) return res.status(400).json({ error: 'invalid listingId' });

  if (process.env.USE_MOCK_DB === 'true') {
    if (!mockDB.messages) mockDB.messages = [];
    const msgs = mockDB.messages.filter((m: any) => m.listing_id === listingId).slice(-200);
    return res.json(msgs);
  }

  if (process.env.USE_FILE_DB === 'true') {
    const msgs = fileDb.getMessages(listingId);
    return res.json(msgs);
  }

  // Postgres path not implemented yet
  return res.status(501).json({ error: 'messages not implemented for postgres yet' });
}

export async function createMessage(req: Request, res: Response) {
  const userId = Number((req as any).userId);
  const { listingId, text } = req.body || {};
  const lid = Number(listingId);
  if (!lid || !text || String(text).trim().length === 0) return res.status(400).json({ error: 'listingId and text required' });

  if (process.env.USE_MOCK_DB === 'true') {
    if (!mockDB.messages) { mockDB.messages = []; mockDB.nextMessageId = 1; }
    const m = { id: mockDB.nextMessageId++, listing_id: lid, sender_id: userId, text: String(text), created_at: new Date().toISOString() };
    mockDB.messages.push(m);
    return res.json(m);
  }

  if (process.env.USE_FILE_DB === 'true') {
    const m = fileDb.addMessage({ listing_id: lid, sender_id: userId, text: String(text) });
    return res.json(m);
  }

  // Postgres path not implemented yet
  return res.status(501).json({ error: 'messages not implemented for postgres yet' });
}
