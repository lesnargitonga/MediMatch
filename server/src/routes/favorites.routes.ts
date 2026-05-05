import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { saveListing, unsaveListing, getSavedListings } from '../controllers/favorites.controller';

const router = Router();

router.post('/listings/save', authMiddleware, saveListing);
router.delete('/listings/save/:listing_id', authMiddleware, unsaveListing);
router.get('/listings/saved', authMiddleware, getSavedListings);

export default router;
