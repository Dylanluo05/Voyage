import { apiFetch } from './client';
import type { UserProfile } from '../types';

export function getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users`, {
        method: 'GET',
    });
}

export function updateProfile(data: { bio?: string; wishlist?: string[]; avatarUrl?: string }): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

