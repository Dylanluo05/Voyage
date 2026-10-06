import { apiFetch } from './client';
import type { AdminAnalytics } from '../types';

export function getAnalytics(): Promise<AdminAnalytics> {
  return apiFetch<AdminAnalytics>('/api/admin/analytics');
}
