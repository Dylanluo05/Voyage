import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicTrip, addGuestPhoto } from '../controllers/tripsController';

const router = Router();

router.get('/trips/:token', getPublicTrip);
// Anonymous writes: keep this tight.
const guestUploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/:shareToken/photos', guestUploadLimiter, addGuestPhoto);

export default router;
