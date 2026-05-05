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

// All routes require authentication
router.get('/notifications', authMiddleware, getNotifications);
router.get('/notifications/unread-count', authMiddleware, getUnreadCount);
router.put('/notifications/:id/read', authMiddleware, markAsRead);
router.put('/notifications/mark-all-read', authMiddleware, markAllAsRead);
router.delete('/notifications/:id', authMiddleware, deleteNotification);

export default router;
