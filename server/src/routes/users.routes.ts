import { Router } from 'express';
import { register, login, me, updateMe, logout } from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, updateMe);

export default router;
