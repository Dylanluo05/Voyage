import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { env } from '../config/env';
import { getQuotaStatus, FREE_DAILY_LIMIT } from '../lib/aiQuota';

type StripeInstance = InstanceType<typeof Stripe>;

function getStripe(): StripeInstance {
  if (!env.stripeSecretKey) throw new HttpError(503, 'Billing not configured');
  return new Stripe(env.stripeSecretKey);
}

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { next(new HttpError(401, 'Unauthenticated')); return; }
    if (!env.stripePriceId) { next(new HttpError(503, 'Billing not configured')); return; }

    const stripe = getStripe();
    const user = await User.findById(req.user.sub).select('email aiUsage');
    if (!user) { next(new HttpError(404, 'User not found')); return; }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: env.stripePriceId, quantity: 1 }],
      success_url: `${env.clientOrigin}/billing/success`,
      cancel_url: `${env.clientOrigin}/billing/cancel`,
      metadata: { userId: req.user.sub },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!env.stripeWebhookSecret) { res.sendStatus(400); return; }
    const stripe = getStripe();
    const sig = req.headers['stripe-signature'] as string;

    let event: ReturnType<StripeInstance['webhooks']['constructEvent']>;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.stripeWebhookSecret);
    } catch {
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: Record<string, string>; customer?: string; subscription?: string };
      const userId = session.metadata?.userId;
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          'aiUsage.plan': 'pro',
          'aiUsage.stripeCustomerId': session.customer,
          'aiUsage.stripeSubscriptionId': session.subscription,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as { id: string };
      await User.findOneAndUpdate(
        { 'aiUsage.stripeSubscriptionId': sub.id },
        { 'aiUsage.plan': 'free', 'aiUsage.stripeSubscriptionId': undefined },
      );
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
}

export async function getBillingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { next(new HttpError(401, 'Unauthenticated')); return; }
    const status = await getQuotaStatus(req.user.sub);
    res.json({ ...status, freeLimit: FREE_DAILY_LIMIT });
  } catch (err) {
    next(err);
  }
}
