import { Router } from 'express';
import { getOrCreateConversation, getConversations, getMessages, sendMessage } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

router.post('/conversations', getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;
