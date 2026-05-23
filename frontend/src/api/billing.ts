import { apiFetch } from './client';

export interface BillingStatus {
  plan: 'free' | 'pro';
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  freeLimit: number;
}

export function getBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>('/api/billing/status');
}

export async function startCheckout(): Promise<void> {
  const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', { method: 'POST' });
  if (url) window.location.href = url;
}
