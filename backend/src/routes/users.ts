import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getProfile,
    updateProfile,
    deleteAccount,
} from '../controllers/usersController';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.put('/profile', updateProfile);
router.delete('/account', deleteAccount);

export default router;