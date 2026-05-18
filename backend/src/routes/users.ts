import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getProfile,
    addBadge,
    removeBadge,
} from '../controllers/usersController';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.post('/badges', addBadge);
router.delete('/badges/:badgeId', removeBadge);

export default router;