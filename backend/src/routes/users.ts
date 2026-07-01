import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getProfile,
    updateProfile,
} from '../controllers/usersController';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.put('/profile', updateProfile);

export default router;