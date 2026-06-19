import { Router } from 'express';
import { getRedistributionPlan } from '../controllers/redistribution.controller';
import { getBrief } from '../controllers/brief.controller';

const router = Router();

// Public — anchors the landing command map.
router.get('/plan', getRedistributionPlan);
router.post('/brief', getBrief);

export default router;
