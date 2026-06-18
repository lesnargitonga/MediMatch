import { Router } from 'express';
import { getRedistributionPlan } from '../controllers/redistribution.controller';

const router = Router();

// Public — anchors the landing command map.
router.get('/plan', getRedistributionPlan);

export default router;
