import { User, Plan } from '../models/User';
import { HttpError } from '../middleware/error';

export interface TierConfig {
  aiRequestsPerDay: number;   // -1 = unlimited
  maxTrips: number;           // -1 = unlimited
  label: string;
  price: number;              // USD/month, 0 = free
}

export const TIER_CONFIG: Record<Plan, TierConfig> = {
  free:         { aiRequestsPerDay: 5,   maxTrips: 3,  label: 'Free',         price: 0     },
  explorer:     { aiRequestsPerDay: 30,  maxTrips: 15, label: 'Explorer',     price: 4.99  },
  pro:          { aiRequestsPerDay: 100, maxTrips: -1, label: 'Pro',          price: 9.99  },
  globetrotter: { aiRequestsPerDay: 500, maxTrips: -1, label: 'Globetrotter', price: 19.99 },
};

function nextMidnightUTC(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

import { env } from '../config/env';
const ADMIN_EMAILS = env.adminEmails;

export async function checkAndIncrementQuota(userId: string): Promise<{ remaining: number; resetAt: Date }> {
  const initial = await User.findById(userId).select('aiUsage email');
  if (!initial) throw new HttpError(401, 'User not found');

  if (ADMIN_EMAILS.has(initial.email)) return { remaining: -1, resetAt: new Date(0) };

  const now = new Date();
  const plan: Plan = (initial.aiUsage?.plan as Plan) ?? 'free';
  const { aiRequestsPerDay, label } = TIER_CONFIG[plan];

  // Roll the daily window forward if it has passed. Safe to run redundantly
  // under concurrent requests — worst case this no-ops on the loser.
  if (!initial.aiUsage || initial.aiUsage.resetAt <= now) {
    await User.updateOne(
      { _id: userId, $or: [{ 'aiUsage.resetAt': { $lte: now } }, { aiUsage: { $exists: false } }] },
      { $set: { 'aiUsage.count': 0, 'aiUsage.resetAt': nextMidnightUTC(), 'aiUsage.plan': plan } }
    );
  }

  // Atomic check-and-increment: the filter and the $inc happen as one
  // MongoDB operation, so two concurrent requests can't both slip past the
  // limit the way a separate read-then-write would allow.
  const filter =
    aiRequestsPerDay === -1
      ? { _id: userId }
      : { _id: userId, 'aiUsage.count': { $lt: aiRequestsPerDay } };

  const updated = await User.findOneAndUpdate(
    filter,
    { $inc: { 'aiUsage.count': 1 } },
    { new: true, select: 'aiUsage' }
  );

  if (!updated) {
    throw new HttpError(429,
      `Daily AI limit reached (${aiRequestsPerDay}/day on the ${label} plan). Upgrade for more requests.`
    );
  }

  const remaining = aiRequestsPerDay === -1 ? -1 : aiRequestsPerDay - updated.aiUsage.count;
  return { remaining, resetAt: updated.aiUsage.resetAt };
}

export async function checkTripQuota(userId: string): Promise<void> {
  const user = await User.findById(userId).select('aiUsage email');
  if (!user) throw new HttpError(401, 'User not found');

  if (ADMIN_EMAILS.has(user.email)) return;

  const plan: Plan = (user.aiUsage?.plan as Plan) ?? 'free';
  const { maxTrips, label } = TIER_CONFIG[plan];
  if (maxTrips === -1) return;

  const { Trip } = await import('../models/Trip');
  const count = await Trip.countDocuments({ owner: userId });
  if (count >= maxTrips) {
    throw new HttpError(403,
      `Trip limit reached (${maxTrips} trips on the ${label} plan). Upgrade to create more trips.`
    );
  }
}

export async function getQuotaStatus(userId: string): Promise<{
  plan: Plan;
  used: number;
  aiRequestsPerDay: number;
  remaining: number;
  maxTrips: number;
  resetAt: Date;
}> {
  const user = await User.findById(userId).select('aiUsage email');
  if (!user) throw new HttpError(401, 'User not found');

  if (ADMIN_EMAILS.has(user.email)) {
    return { plan: 'globetrotter', used: 0, aiRequestsPerDay: -1, remaining: -1, maxTrips: -1, resetAt: new Date(0) };
  }

  const now = new Date();
  const usage = user.aiUsage ?? { count: 0, resetAt: now, plan: 'free' as Plan };
  const plan: Plan = (usage.plan as Plan) ?? 'free';
  const { aiRequestsPerDay, maxTrips } = TIER_CONFIG[plan];
  const count = usage.resetAt <= now ? 0 : usage.count;

  return {
    plan,
    used: count,
    aiRequestsPerDay,
    remaining: aiRequestsPerDay === -1 ? -1 : Math.max(0, aiRequestsPerDay - count),
    maxTrips,
    resetAt: usage.resetAt,
  };
}
