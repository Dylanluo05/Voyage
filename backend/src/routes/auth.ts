import { Router } from 'express';
import { register, googleAuth, login, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/google', googleAuth);
router.post('/login', login);
router.get('/me', requireAuth, me);

export default router;
