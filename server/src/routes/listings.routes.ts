import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createListing, getListings, getListingById, updateListing, deleteListing } from '../controllers/listings.controller';
const router = Router();

router.get('/', getListings);
router.get('/:id', getListingById);
router.post('/', authMiddleware, createListing);
router.put('/:id', authMiddleware, updateListing);
router.delete('/:id', authMiddleware, deleteListing);

export default router;
