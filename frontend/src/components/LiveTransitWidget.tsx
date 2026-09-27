import { useEffect, useState } from 'react';
import { getNearbyTransit } from '../api/transit';
import type { NearbyTransitStation } from '../types';
import { Icon } from './Icon';

const NYC_BBOX = { minLat: 40.4, maxLat: 40.95, minLng: -74.3, maxLng: -73.65 };

interface Props {
  lat: number;
  lng: number;
}

export default function LiveTransitWidget({ lat, lng }: Props) {
  const [stations, setStations] = useState<NearbyTransitStation[]>([]);
  const [loading, setLoading] = useState(true);

  const inNyc =
    lat >= NYC_BBOX.minLat && lat <= NYC_BBOX.maxLat && lng >= NYC_BBOX.minLng && lng <= NYC_BBOX.maxLng;

  useEffect(() => {
    if (!inNyc) return;
    let cancelled = false;

    async function fetchArrivals() {
      try {
        const { stations: result } = await getNearbyTransit(lat, lng);
        if (!cancelled) setStations(result);
      } catch (err) {
        console.error('[LiveTransitWidget]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchArrivals();
    const timer = window.setInterval(() => {
      if (!document.hidden) fetchArrivals();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, inNyc]);

  if (!inNyc || loading || stations.length === 0) return null;

  return (
    <div className="live-transit-widget">
      {stations.map((station) => (
        <div key={station.complexId} className="live-transit-station">
          <div className="live-transit-station-name">
            <Icon name="bus" size={12} /> {station.name}
          </div>
          <div className="live-transit-arrivals">
            {station.arrivals.slice(0, 6).map((arrival, i) => (
              <span key={`${arrival.route}-${arrival.direction}-${i}`} className="live-transit-arrival">
                <span className="live-transit-route">{arrival.route}</span>
                {arrival.directionLabel ? ` ${arrival.directionLabel} ` : ' '}
                {arrival.minutes}m
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
