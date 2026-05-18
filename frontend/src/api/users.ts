import { apiFetch } from './client';
import type { UserProfile } from '../types';

export function getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users`, {
        method: 'GET',
    });
}

export function addBadge(badge: { destination: string; countryCode?: string }): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users/badges`, {
        method: 'POST',
        body: JSON.stringify(badge),
    });
}

export function removeBadge(badgeId: string): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users/badges/${badgeId}`, {
        method: 'DELETE',
    });
}
