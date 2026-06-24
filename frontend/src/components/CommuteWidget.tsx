import { useEffect, useRef, useState } from 'react';
import type { Location } from '../types';

interface Props {
  origin: Location;
  destination: Location;
}

type TravelMode = 'DRIVING' | 'WALKING' | 'TRANSIT' | 'BICYCLING';

const MODES: { mode: TravelMode; icon: string; label: string }[] = [
  { mode: 'DRIVING',   icon: '🚗', label: 'Drive'   },
  { mode: 'WALKING',   icon: '🚶', label: 'Walk'    },
  { mode: 'TRANSIT',   icon: '🚌', label: 'Transit' },
  { mode: 'BICYCLING', icon: '🚴', label: 'Bike'    },
];

export default function CommuteWidget({ origin, destination }: Props) {
  const [mode, setMode] = useState<TravelMode>('DRIVING');
  const [duration, setDuration] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const originRef: google.maps.LatLng | google.maps.Place | string =
      origin.lat !== undefined && origin.lng !== undefined
        ? new google.maps.LatLng(origin.lat, origin.lng)
        : (origin.address || origin.name || '');
    const destRef: google.maps.LatLng | google.maps.Place | string =
      destination.lat !== undefined && destination.lng !== undefined
        ? new google.maps.LatLng(destination.lat, destination.lng)
        : (destination.address || destination.name || '');

    if (!originRef || !destRef) return;

    setLoading(true);
    setError(false);
    setDuration(null);
    setDistance(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    let cancelled = false;

    timerRef.current = setTimeout(() => {
      if (mode === 'TRANSIT') {
        const service = new google.maps.DirectionsService();
        service.route(
          {
            origin: originRef,
            destination: destRef,
            travelMode: google.maps.TravelMode.TRANSIT,
            transitOptions: { departureTime: new Date() },
          },
          (result, status) => {
            if (cancelled) return;
            setLoading(false);
            const leg = result?.routes?.[0]?.legs?.[0];
            if (status === 'OK' && leg) {
              setDuration(leg.duration?.text ?? null);
              setDistance(leg.distance?.text ?? null);
            } else {
              setError(true);
            }
          }
        );
      } else {
        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
          {
            origins: [originRef],
            destinations: [destRef],
            travelMode: google.maps.TravelMode[mode],
          },
          (response, status) => {
            if (cancelled) return;
            setLoading(false);
            if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
              const el = response.rows[0].elements[0];
              setDuration(el.duration.text);
              setDistance(el.distance.text);
            } else {
              setError(true);
            }
          }
        );
      }
    }, 400);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [origin.lat, origin.lng, origin.address, origin.name, destination.lat, destination.lng, destination.address, destination.name, mode]);

  return (
    <div className="commute-widget">
      <div className="commute-line" />
      <div className="commute-content">
        <div className="commute-modes">
          {MODES.map(({ mode: m, icon, label }) => (
            <button
              key={m}
              type="button"
              className={`commute-mode-btn${mode === m ? ' active' : ''}`}
              onClick={() => setMode(m)}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
        <span className="commute-duration">
          {loading ? '…' : error ? 'unavailable' : (
            duration ? `${duration}${distance ? ` · ${distance}` : ''}` : '–'
          )}
        </span>
      </div>
      <div className="commute-line" />
    </div>
  );
}
