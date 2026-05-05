import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createMatch, suggestMatches } from '../controllers/matches.controller';

const router = Router();
router.post('/', authMiddleware, createMatch);
router.get('/suggest', authMiddleware, suggestMatches);

export default router;
