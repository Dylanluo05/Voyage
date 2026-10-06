import { Router } from 'express';
import {
  register,
  googleAuth,
  login,
  me,
  verifyOtpHandler,
  resendOtpHandler,
  forgotPassword,
  resetPasswordHandler,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/google', googleAuth);
router.post('/login', login);
router.post('/verify-otp', verifyOtpHandler);
router.post('/resend-otp', resendOtpHandler);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordHandler);
router.get('/me', requireAuth, me);

export default router;
