import { apiFetch } from './client';
import { isNative, openExternal } from '../utils/native';

export type Plan = 'free' | 'explorer' | 'pro' | 'globetrotter';

export interface TierConfig {
  aiRequestsPerDay: number;
  maxTrips: number;
  label: string;
  price: number;
}

export interface BillingStatus {
  plan: Plan;
  used: number;
  aiRequestsPerDay: number;
  remaining: number;
  maxTrips: number;
  resetAt: string;
  tierConfig: Record<Plan, TierConfig>;
  hasSubscription: boolean;
}

export function getBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>('/api/billing/status');
}

export async function startCheckout(tier: Exclude<Plan, 'free'>): Promise<void> {
  const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ tier, native: isNative }),
  });
  if (url) await openExternal(url);
}

export async function openPortal(): Promise<void> {
  const { url } = await apiFetch<{ url: string }>('/api/billing/portal', {
    method: 'POST',
    body: JSON.stringify({ native: isNative }),
  });
  if (url) await openExternal(url);
}
