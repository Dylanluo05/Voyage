import { apiFetch } from './client';
import type { Trip, NewTripInput, NewItemInput, ReorderInput, Recommendation, SpotifySearchResult, LogPhoto, HotelBooking, FlightBooking, Expense } from '../types';

export function updateDayAnchor(
  tripId: string,
  day: number,
  startAddress?: string,
  endAddress?: string,
): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/day-anchor`, {
    method: 'PATCH',
    body: JSON.stringify({ day, startAddress, endAddress }),
  });
}

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

export function getRecommendations(tripId: string, excludeTitles?: string[]): Promise<Recommendation[]> {
  const qs = excludeTitles?.length
    ? `?exclude=${encodeURIComponent(JSON.stringify(excludeTitles))}`
    : '';
  return apiFetch<Recommendation[]>(`/api/trips/${tripId}/recommendations${qs}`);
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

export function updateBudget(tripId: string, budget: number): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/budget`, {
    method: 'PUT',
    body: JSON.stringify({ budget }),
  });
}

export function searchSpotify(tripId: string, q: string): Promise<SpotifySearchResult[]> {
  return apiFetch<SpotifySearchResult[]>(`/api/trips/${tripId}/playlist/search?q=${encodeURIComponent(q)}`);
}

export function recommendByVibe(tripId: string, vibes: string): Promise<{ params: Record<string, unknown>; results: SpotifySearchResult[] }> {
  return apiFetch(`/api/trips/${tripId}/playlist/recommend?vibes=${encodeURIComponent(vibes)}`);
}

export function addTrack(tripId: string, track: SpotifySearchResult): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/playlist`, {
    method: 'POST',
    body: JSON.stringify(track),
  });
}

export function removeTrack(tripId: string, trackId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/playlist/${trackId}`, {
    method: 'DELETE',
  });
}

export function parseHotelText(tripId: string, text: string): Promise<Omit<HotelBooking, '_id'>> {
  return apiFetch(`/api/trips/${tripId}/hotels/parse`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function parseFlightText(tripId: string, text: string): Promise<Omit<FlightBooking, '_id'>> {
  return apiFetch(`/api/trips/${tripId}/flights/parse`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function addHotel(tripId: string, hotel: Omit<HotelBooking, '_id'>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/hotels`, {
    method: 'POST',
    body: JSON.stringify(hotel),
  });
}

export function removeHotel(tripId: string, hotelId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/hotels/${hotelId}`, {
    method: 'DELETE',
  });
}

export function addFlight(tripId: string, flight: Omit<FlightBooking, '_id'>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/flights`, {
    method: 'POST',
    body: JSON.stringify(flight),
  });
}

export function removeFlight(tripId: string, flightId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/flights/${flightId}`, {
    method: 'DELETE',
  });
}

export function addExpense(tripId: string, expense: Omit<Expense, '_id' | 'createdAt'>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export function removeExpense(tripId: string, expenseId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}

export function settleSplit(tripId: string, expenseId: string, userId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/expenses/${expenseId}/splits/${userId}`, {
    method: 'PATCH',
  });
}

export function addSidequest(tripId: string, sidequest: { title: string; description?: string }): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests`, {
    method: 'POST',
    body: JSON.stringify(sidequest),
  });
}

export function removeSidequest(tripId: string, sidequestId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/${sidequestId}`, {
    method: 'DELETE',
  });
}

export function assignSidequest(tripId: string, sidequestId: string, assigneeId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/${sidequestId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assigneeId }),
  });
}

export function completeSidequest(tripId: string, sidequestId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/${sidequestId}/complete`, {
    method: 'PATCH',
  });
}

export function addComment(tripId: string, sidequestId: string, comment: { text: string, imageUrl?: string }): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/${sidequestId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
}

export function removeComment(tripId: string, sidequestId: string, commentId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/sidequests/${sidequestId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

// ── Share ─────────────────────────────────────────────────────────────────

export function getPublicTrip(shareToken: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/public/trips/${shareToken}`);
}

export function addGuestPhoto(shareToken: string, payload: { url: string; day?: number; caption?: string }): Promise<Trip> {
  return apiFetch<Trip>(`/api/public/${shareToken}/photos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Trip log ──────────────────────────────────────────────────────────────

export function markCompleted(tripId: string, isCompleted: boolean): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ isCompleted }),
  });
}

export function addLogPhoto(tripId: string, photo: Pick<LogPhoto, 'url' | 'day' | 'caption'>): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/log/photos`, {
    method: 'POST',
    body: JSON.stringify(photo),
  });
}

export function removeLogPhoto(tripId: string, photoId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/log/photos/${photoId}`, {
    method: 'DELETE',
  });
}

export function rateItem(tripId: string, itemId: string, rating: number): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/log/items/${itemId}/rating`, {
    method: 'PUT',
    body: JSON.stringify({ rating }),
  });
}
