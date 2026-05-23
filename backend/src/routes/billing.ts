import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth';
import { createCheckoutSession, stripeWebhook, getBillingStatus } from '../controllers/billingController';

const router = Router();

// Raw body required for Stripe signature verification
router.post('/webhook', raw({ type: 'application/json' }), stripeWebhook);

router.use(requireAuth);
router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);

export default router;
