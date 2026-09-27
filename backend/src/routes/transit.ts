import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getNearbyTransitHandler } from '../controllers/transitController';

const router = Router();
router.get('/nearby', requireAuth, getNearbyTransitHandler);
export default router;
