import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createCheckoutSession, createPortalSession, getBillingStatus } from '../controllers/billingController';

const router = Router();

// The Stripe webhook is mounted in index.ts, before express.json().
router.use(requireAuth);
router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

export default router;
