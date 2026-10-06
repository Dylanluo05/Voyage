import Stripe from 'stripe';
import { HttpError } from '../middleware/error';
import { env } from '../config/env';

export type StripeInstance = InstanceType<typeof Stripe>;

export function getStripe(): StripeInstance {
  if (!env.stripeSecretKey) throw new HttpError(503, 'Billing not configured — add STRIPE_SECRET_KEY');
  return new Stripe(env.stripeSecretKey);
}
