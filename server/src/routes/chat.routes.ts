import { Router } from 'express';
import { getOrCreateConversation, getConversations, getMessages, sendMessage } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const MOCK = process.env.USE_MOCK_DB === 'true';

// All chat routes require authentication
router.use(authMiddleware);

router.post('/conversations', MOCK ? (_req, res) => res.json([]) : getOrCreateConversation);
router.get('/conversations', MOCK ? (_req, res) => res.json([]) : getConversations);
router.get('/conversations/:conversationId/messages', MOCK ? (_req, res) => res.json([]) : getMessages);
router.post('/conversations/:conversationId/messages', MOCK ? (_req, res) => res.status(200).json({ ok: true }) : sendMessage);

export default router;
