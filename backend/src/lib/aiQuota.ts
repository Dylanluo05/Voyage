import { User } from '../models/User';
import { HttpError } from '../middleware/error';

export const FREE_DAILY_LIMIT = 10;

function nextMidnightUTC(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

export async function checkAndIncrementQuota(userId: string): Promise<{ remaining: number; resetAt: Date }> {
  const user = await User.findById(userId).select('aiUsage');
  if (!user) throw new HttpError(401, 'User not found');

  const now = new Date();
  const usage = user.aiUsage ?? { count: 0, resetAt: now, plan: 'free' };

  if (usage.resetAt <= now) {
    usage.count = 0;
    usage.resetAt = nextMidnightUTC();
  }

  if (usage.plan === 'free' && usage.count >= FREE_DAILY_LIMIT) {
    throw new HttpError(429, `Daily AI limit reached (${FREE_DAILY_LIMIT}/day on the free plan). Upgrade to Pro for unlimited requests.`);
  }

  usage.count += 1;
  user.aiUsage = usage;
  await user.save();

  const remaining = usage.plan === 'pro' ? -1 : FREE_DAILY_LIMIT - usage.count;
  return { remaining, resetAt: usage.resetAt };
}

export async function getQuotaStatus(userId: string): Promise<{
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}> {
  const user = await User.findById(userId).select('aiUsage');
  if (!user) throw new HttpError(401, 'User not found');

  const now = new Date();
  const usage = user.aiUsage ?? { count: 0, resetAt: now, plan: 'free' };
  const count = usage.resetAt <= now ? 0 : usage.count;
  const isPro = usage.plan === 'pro';

  return {
    plan: usage.plan ?? 'free',
    used: count,
    limit: isPro ? -1 : FREE_DAILY_LIMIT,
    remaining: isPro ? -1 : Math.max(0, FREE_DAILY_LIMIT - count),
    resetAt: usage.resetAt,
  };
}
