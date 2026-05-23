import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { User, Plan } from '../models/User';
import { HttpError } from '../middleware/error';
import { env } from '../config/env';
import { getQuotaStatus, TIER_CONFIG } from '../lib/aiQuota';

type StripeInstance = InstanceType<typeof Stripe>;

function getStripe(): StripeInstance {
  if (!env.stripeSecretKey) throw new HttpError(503, 'Billing not configured — add STRIPE_SECRET_KEY');
  return new Stripe(env.stripeSecretKey);
}

const PRICE_MAP: Record<Exclude<Plan, 'free'>, () => string> = {
  explorer:     () => env.stripePriceExplorer,
  pro:          () => env.stripePricePro,
  globetrotter: () => env.stripePriceGlobetrotter,
};

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { next(new HttpError(401, 'Unauthenticated')); return; }

    const { tier } = z.object({
      tier: z.enum(['explorer', 'pro', 'globetrotter']),
    }).parse(req.body);

    const priceId = PRICE_MAP[tier]();
    if (!priceId) { next(new HttpError(503, `Stripe price for ${tier} not configured`)); return; }

    const stripe = getStripe();
    const user = await User.findById(req.user.sub).select('email aiUsage');
    if (!user) { next(new HttpError(404, 'User not found')); return; }

    // If they already have a Stripe customer, attach to it
    const customerParam = user.aiUsage?.stripeCustomerId
      ? { customer: user.aiUsage.stripeCustomerId }
      : { customer_email: user.email };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...customerParam,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.clientOrigin}/subscription?success=1`,
      cancel_url: `${env.clientOrigin}/subscription`,
      metadata: { userId: req.user.sub, tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

export async function createPortalSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { next(new HttpError(401, 'Unauthenticated')); return; }

    const user = await User.findById(req.user.sub).select('aiUsage');
    if (!user) { next(new HttpError(404, 'User not found')); return; }
    if (!user.aiUsage?.stripeCustomerId) {
      next(new HttpError(400, 'No active subscription found'));
      return;
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.aiUsage.stripeCustomerId,
      return_url: `${env.clientOrigin}/subscription`,
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
      const session = event.data.object as {
        metadata?: Record<string, string>;
        customer?: string;
        subscription?: string;
      };
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier as Plan | undefined;
      if (userId && tier) {
        await User.findByIdAndUpdate(userId, {
          'aiUsage.plan': tier,
          'aiUsage.stripeCustomerId': session.customer,
          'aiUsage.stripeSubscriptionId': session.subscription,
        });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as { id: string; items?: { data?: Array<{ price?: { id: string } }> } };
      const priceId = sub.items?.data?.[0]?.price?.id;
      if (priceId) {
        const tier = (Object.entries(PRICE_MAP) as [Exclude<Plan, 'free'>, () => string][])
          .find(([, fn]) => fn() === priceId)?.[0];
        if (tier) {
          await User.findOneAndUpdate(
            { 'aiUsage.stripeSubscriptionId': sub.id },
            { 'aiUsage.plan': tier }
          );
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as { id: string };
      await User.findOneAndUpdate(
        { 'aiUsage.stripeSubscriptionId': sub.id },
        { 'aiUsage.plan': 'free', 'aiUsage.stripeSubscriptionId': undefined }
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
    const user = await User.findById(req.user.sub).select('aiUsage');
    const hasSubscription = !!user?.aiUsage?.stripeSubscriptionId;
    res.json({ ...status, tierConfig: TIER_CONFIG, hasSubscription });
  } catch (err) {
    next(err);
  }
}
