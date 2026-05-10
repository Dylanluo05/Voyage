import { apiFetch } from './client';
import type { Trip, NewTripInput, NewItemInput, ReorderInput, Recommendation } from '../types';

export function listTrips(): Promise<Trip[]> {
  return apiFetch<Trip[]>('/api/trips');
}

export function createTrip(input: NewTripInput): Promise<Trip> {
  return apiFetch<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getTrip(id: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${id}`);
}

export function updateTrip(id: string, input: Partial<NewTripInput>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTrip(id: string): Promise<void> {
  return apiFetch<void>(`/api/trips/${id}`, { method: 'DELETE' });
}

export function addItem(tripId: string, input: NewItemInput): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateItem(tripId: string, itemId: string, input: Partial<NewItemInput>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteItem(tripId: string, itemId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export function reorderItems(tripId: string, input: ReorderInput): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/reorder`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getRecommendations(tripId: string): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/api/trips/${tripId}/recommendations`);
}

export function reactToItem(tripId: string, itemId: string, emoji: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/items/${itemId}/react`, {
    method: 'PUT',
    body: JSON.stringify({ emoji }),
  });
}

export function inviteCollaborator(tripId: string, email: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/collaborators`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeCollaborator(tripId: string, userId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/collaborators/${userId}`, {
    method: 'DELETE',
  });
}

export function createGroup(tripId: string, input: { title: string; day: number; itemIds: string[] }): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/groups`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function renameGroup(tripId: string, groupId: string, title: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export function dissolveGroup(tripId: string, groupId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/groups/${groupId}`, {
    method: 'DELETE',
  });
}

export function createDebate(
  tripId: string,
  input: { title: string; day: number; options: Array<{ title: string }> }
): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteDebate(tripId: string, debateId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}`, {
    method: 'DELETE',
  });
}

export function addDebateOption(tripId: string, debateId: string, title: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/options`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function updateDebateOption(
  tripId: string,
  debateId: string,
  optionId: string,
  patch: { title?: string; pros?: string[]; cons?: string[] }
): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/options/${optionId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deleteDebateOption(tripId: string, debateId: string, optionId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/options/${optionId}`, {
    method: 'DELETE',
  });
}

export function voteDebateOption(tripId: string, debateId: string, optionId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/options/${optionId}/vote`, {
    method: 'PUT',
  });
}

export function addDebateComment(tripId: string, debateId: string, text: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function deleteDebateComment(tripId: string, debateId: string, commentId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/debates/${debateId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}
