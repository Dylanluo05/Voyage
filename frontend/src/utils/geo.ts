import type { PublicSidequest, QuestPlace } from '../types';

export type LatLng = { lat: number; lng: number };

const EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const hasPlaces = (q: PublicSidequest): boolean => (q.places?.length ?? 0) > 0;

/** The closest pinned place of a quest to a position, with its distance. */
export function nearestPlace(q: PublicSidequest, pos: LatLng): { place: QuestPlace; km: number } | null {
  let best: { place: QuestPlace; km: number } | null = null;
  for (const place of q.places ?? []) {
    const km = distanceKm(pos, place);
    if (!best || km < best.km) best = { place, km };
  }
  return best;
}

/** US locales see miles, everyone else kilometres. */
export const USES_MILES = typeof navigator !== 'undefined' && /^en-US/i.test(navigator.language);
export const KM_PER_UNIT = USES_MILES ? 1.609344 : 1;
export const UNIT_LABEL = USES_MILES ? 'mi' : 'km';

export function formatDistance(km: number): string {
  const v = km / KM_PER_UNIT;
  if (v < 0.1) return 'right here';
  if (v < 10) return `${v.toFixed(1)} ${UNIT_LABEL} away`;
  return `${Math.round(v).toLocaleString()} ${UNIT_LABEL} away`;
}

export const mapsLink = (p: LatLng) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const directionsLink = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
