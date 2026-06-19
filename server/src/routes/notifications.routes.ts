import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from '../controllers/notifications.controller';

const router = Router();
const MOCK = process.env.USE_MOCK_DB === 'true';

// All routes require authentication
router.get('/notifications', authMiddleware, MOCK ? (_req, res) => res.json([]) : getNotifications);
router.get('/notifications/unread-count', authMiddleware, MOCK ? (_req, res) => res.json({ count: 0 }) : getUnreadCount);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.put('/notifications/mark-all-read', authMiddleware, markAllAsRead);
router.delete('/notifications/:id', authMiddleware, deleteNotification);

export default router;
