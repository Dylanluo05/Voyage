import { LeaderboardEntry, PublicSidequest, Trip } from '../types';
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
        cardSuit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
        cardRank: 'J' | 'Q' | 'K' | 'A';
        event?: {
            date: string;
            maxParticipants?: number;
        };
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

export function unclaimPublicSidequest(
    id: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/unclaim`, {
        method: 'PATCH',
    });
}

export function enrollInSidequest(
    id: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/enroll`, {
        method: 'PATCH',
    });
}

export function leaveEvent(
    id: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/leave`, {
        method: 'PATCH',
    });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    return apiFetch<LeaderboardEntry[]>(`/api/public-sidequests/leaderboard`, {
        method: 'GET',
    });
}
