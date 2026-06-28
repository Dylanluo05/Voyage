import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getProfile,
    updateProfile,
    addBadge,
    removeBadge,
} from '../controllers/usersController';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.put('/profile', updateProfile);
router.post('/badges', addBadge);
router.delete('/badges/:badgeId', removeBadge);

export default router;