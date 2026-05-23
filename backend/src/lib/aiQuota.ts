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

export async function checkAndIncrementQuota(userId: string): Promise<{ remaining: number; resetAt: Date }> {
  const user = await User.findById(userId).select('aiUsage');
  if (!user) throw new HttpError(401, 'User not found');

  const now = new Date();
  const usage = user.aiUsage ?? { count: 0, resetAt: now, plan: 'free' as Plan };
  const plan: Plan = (usage.plan as Plan) ?? 'free';
  const { aiRequestsPerDay, label } = TIER_CONFIG[plan];

  if (usage.resetAt <= now) {
    usage.count = 0;
    usage.resetAt = nextMidnightUTC();
  }

  if (aiRequestsPerDay !== -1 && usage.count >= aiRequestsPerDay) {
    throw new HttpError(429,
      `Daily AI limit reached (${aiRequestsPerDay}/day on the ${label} plan). Upgrade for more requests.`
    );
  }

  usage.count += 1;
  user.aiUsage = usage;
  await user.save();

  const remaining = aiRequestsPerDay === -1 ? -1 : aiRequestsPerDay - usage.count;
  return { remaining, resetAt: usage.resetAt };
}

export async function checkTripQuota(userId: string): Promise<void> {
  const user = await User.findById(userId).select('aiUsage');
  if (!user) throw new HttpError(401, 'User not found');

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
  const user = await User.findById(userId).select('aiUsage');
  if (!user) throw new HttpError(401, 'User not found');

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
