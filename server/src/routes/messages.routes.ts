import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listMessages, createMessage } from '../controllers/messages.controller';

const router = Router();
router.get('/:listingId', authMiddleware, listMessages);
router.post('/', authMiddleware, createMessage);

export default router;
