import { PublicSidequest, Trip } from '../types';
import { apiFetch } from './client';

export function listPublicSidequests(
    location?: string,
): Promise<PublicSidequest[]> {
    return apiFetch<PublicSidequest[]>(`/api/public-sidequests${location ? `?location=${location}` : ''}`, {
        method: 'GET',
    });
}

export function listClaimedSidequests(): Promise<PublicSidequest[]> {
    return apiFetch<PublicSidequest[]>(`/api/public-sidequests/claimed`, {
        method: 'GET',
    });
}

export function createPublicSidequest(
    data: {
        title: string;
        description?: string;
        location?: string;
        difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
    }
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function claimPublicSidequest(
    id: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/claim`, {
        method: 'PATCH',
    });
}

export function completePublicSidequest(
    id: string,
    photoUrl: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ photoUrl }),
    });
}

export function addToTrip(
    publicSidequestId: string,
    tripId: string,
): Promise<Trip> {
    return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/from-public/${publicSidequestId}`, {
        method: 'POST',
    });
}
