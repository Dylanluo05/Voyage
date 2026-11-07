import { isNative } from './native';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type LocationErrorKind = 'unsupported' | 'denied' | 'unavailable';

export class LocationError extends Error {
  kind: LocationErrorKind;
  constructor(kind: LocationErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

const OPTIONS = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 };

/**
 * The device's current position. Uses the Capacitor plugin in the app (which handles the
 * OS permission prompt properly) and the browser Geolocation API on the web.
 * Rejects with a LocationError so callers can show an appropriate message.
 */
export async function getCurrentLocation(): Promise<LatLngPoint> {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation');
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        const asked = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (asked.location !== 'granted' && asked.coarseLocation !== 'granted') {
          throw new LocationError('denied');
        }
      }
      const p = await Geolocation.getCurrentPosition(OPTIONS);
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch (err) {
      if (err instanceof LocationError) throw err;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      throw new LocationError(msg.includes('denied') || msg.includes('permission') ? 'denied' : 'unavailable');
    }
  }

  if (!navigator.geolocation) throw new LocationError('unsupported');
  return new Promise<LatLngPoint>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(new LocationError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      OPTIONS,
    );
  });
}
