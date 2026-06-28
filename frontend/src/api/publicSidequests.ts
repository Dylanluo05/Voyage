import { LeaderboardEntry, PublicSidequest } from '../types';
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
    isPublic = false,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ photoUrl, isPublic }),
    });
}

export function addComment(sidequestId: string, text: string): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${sidequestId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
}

export function removeComment(sidequestId: string, commentId: string): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${sidequestId}/comments/${commentId}`, {
        method: 'DELETE',
    });
}

export function assignClaimToTrip(
    sidequestId: string,
    tripId: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${sidequestId}/assign-trip`, {
        method: 'PATCH',
        body: JSON.stringify({ tripId }),
    });
}

export function unassignClaimFromTrip(
    sidequestId: string,
): Promise<PublicSidequest> {
    return apiFetch<PublicSidequest>(`/api/public-sidequests/${sidequestId}/unassign-trip`, {
        method: 'PATCH',
    });
}

export function getSidequestsByTrip(
    tripId: string,
): Promise<PublicSidequest[]> {
    return apiFetch<PublicSidequest[]>(`/api/public-sidequests/by-trip/${tripId}`, {
        method: 'GET',
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
