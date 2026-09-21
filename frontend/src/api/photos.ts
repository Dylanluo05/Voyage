import { apiFetch } from './client';

/** Backend proxy for Pexels stock photos (needs a signed-in user). */
export function searchPhotos(q: string): Promise<{ urls: string[] }> {
  return apiFetch<{ urls: string[] }>(`/api/photos/search?q=${encodeURIComponent(q)}`, { method: 'GET' });
}
