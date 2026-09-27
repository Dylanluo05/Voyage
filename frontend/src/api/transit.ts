import { apiFetch } from './client';
import type { NearbyTransitStation } from '../types';

export function getNearbyTransit(lat: number, lng: number): Promise<{ stations: NearbyTransitStation[] }> {
  return apiFetch<{ stations: NearbyTransitStation[] }>(`/api/transit/nearby?lat=${lat}&lng=${lng}`);
}
