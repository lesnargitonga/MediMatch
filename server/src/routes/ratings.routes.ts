import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRating, getUserRatings, getUserReputation, canRateUser } from '../controllers/ratings.controller';

const router = Router();

// Submit a rating (protected)
router.post('/ratings', authMiddleware, createRating);

// Get ratings for a specific user (public)
router.get('/users/:user_id/ratings', getUserRatings);

// Get reputation summary for a user (public)
router.get('/users/:user_id/reputation', getUserReputation);

// Check if current user can rate another user (protected)
router.get('/users/:user_id/can-rate', authMiddleware, canRateUser);

export default router;
