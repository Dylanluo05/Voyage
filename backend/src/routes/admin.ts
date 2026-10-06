import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getAnalytics } from '../controllers/adminController';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/analytics', getAnalytics);

export default router;
