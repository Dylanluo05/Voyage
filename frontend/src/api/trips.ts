import { apiFetch } from './client';
import type { Trip, NewTripInput, NewItemInput } from '../types';

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

export function updateItem(
  tripId: string,
  itemId: string,
  input: Partial<NewItemInput>
): Promise<Trip> {
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
