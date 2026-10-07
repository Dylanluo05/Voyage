import { Request, Response, NextFunction } from 'express';
import { User, Plan } from '../models/User';
import { Trip } from '../models/Trip';
import { PublicSidequest } from '../models/PublicSidequest';
import { Report } from '../models/Report';
import { AiCostLog } from '../models/AiCostLog';
import { TIER_CONFIG } from '../lib/aiQuota';

const PLANS: Plan[] = ['free', 'explorer', 'pro', 'globetrotter'];
const DAY_MS = 86_400_000;

export async function getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalUsers,
      newUsers7d,
      newUsers30d,
      totalTrips,
      newTrips7d,
      pendingReports,
      planCountsRaw,
      signupSeriesRaw,
      sidequestAggRaw,
      aiUsageAggRaw,
      aiCostByModelRaw,
      aiCostByFeatureRaw,
      aiCostSeriesRaw,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: since7d } }),
      User.countDocuments({ createdAt: { $gte: since30d } }),
      Trip.countDocuments(),
      Trip.countDocuments({ createdAt: { $gte: since7d } }),
      Report.countDocuments({ status: 'pending' }),
      User.aggregate([{ $group: { _id: '$aiUsage.plan', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      PublicSidequest.aggregate([
        { $project: { claimsCount: { $size: '$claims' }, completionsCount: { $size: '$completions' } } },
        { $group: { _id: null, totalClaims: { $sum: '$claimsCount' }, totalCompletions: { $sum: '$completionsCount' } } },
      ]),
      User.aggregate([
        { $match: { 'aiUsage.resetAt': { $gt: now } } },
        { $group: { _id: null, total: { $sum: '$aiUsage.count' } } },
      ]),
      AiCostLog.aggregate([
        { $group: { _id: '$modelName', costUsd: { $sum: '$costUsd' }, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' } } },
      ]),
      AiCostLog.aggregate([
        { $group: { _id: '$feature', costUsd: { $sum: '$costUsd' } } },
      ]),
      AiCostLog.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, costUsd: { $sum: '$costUsd' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const planCounts: Record<Plan, number> = { free: 0, explorer: 0, pro: 0, globetrotter: 0 };
    for (const row of planCountsRaw as { _id: Plan | null; count: number }[]) {
      planCounts[row._id ?? 'free'] = row.count;
    }

    const estimatedMRR = PLANS.reduce((sum, plan) => sum + planCounts[plan] * TIER_CONFIG[plan].price, 0);

    res.json({
      growth: {
        totalUsers,
        newUsers7d,
        newUsers30d,
        totalTrips,
        newTrips7d,
        totalSidequestClaims: sidequestAggRaw[0]?.totalClaims ?? 0,
        totalSidequestCompletions: sidequestAggRaw[0]?.totalCompletions ?? 0,
        signupSeries: (signupSeriesRaw as { _id: string; count: number }[]).map((s) => ({ date: s._id, count: s.count })),
      },
      revenue: {
        planCounts,
        estimatedMRR,
        tierConfig: TIER_CONFIG,
      },
      health: {
        pendingReports,
        aiRequestsToday: aiUsageAggRaw[0]?.total ?? 0,
      },
      aiCost: {
        byModel: (aiCostByModelRaw as { _id: string; costUsd: number; inputTokens: number; outputTokens: number }[]).map((r) => ({
          model: r._id,
          costUsd: r.costUsd,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
        })),
        byFeature: (aiCostByFeatureRaw as { _id: string; costUsd: number }[]).map((r) => ({ feature: r._id, costUsd: r.costUsd })),
        totalCostUsd: (aiCostByModelRaw as { costUsd: number }[]).reduce((sum, r) => sum + r.costUsd, 0),
        dailySeries: (aiCostSeriesRaw as { _id: string; costUsd: number }[]).map((r) => ({ date: r._id, costUsd: r.costUsd })),
      },
    });
  } catch (err) {
    next(err);
  }
}
