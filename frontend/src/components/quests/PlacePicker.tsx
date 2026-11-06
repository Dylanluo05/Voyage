import { useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import type { QuestPlace } from '../../types';
import { useGoogleMaps } from '../../context/GoogleMapsContext';
import { Icon } from '../Icon';

type Props = {
  places: QuestPlace[];
  onChange: (places: QuestPlace[]) => void;
  max?: number;
};

/** Search for real places (Google Places) and pin them to a quest. */
export default function PlacePicker({ places, onChange, max = 5 }: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');

  function onPlaceChanged() {
    const result = autoRef.current?.getPlace();
    const loc = result?.geometry?.location;
    if (!result?.name || !loc) {
      setNote('Pick a place from the suggestions to pin it.');
      return;
    }
    const place: QuestPlace = {
      name: result.name,
      address: result.formatted_address,
      lat: Number(loc.lat().toFixed(6)),
      lng: Number(loc.lng().toFixed(6)),
    };
    const duplicate = places.some((p) => Math.abs(p.lat - place.lat) < 1e-5 && Math.abs(p.lng - place.lng) < 1e-5);
    if (duplicate) setNote('That place is already pinned.');
    else {
      setNote('');
      onChange([...places, place]);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  if (loadError) return <p className="muted small">Place search is unavailable right now. You can still describe the location above.</p>;

  return (
    <div className="qp">
      <span className="qp-label">Pin it to a place</span>
      {places.length < max &&
        (isLoaded ? (
          <Autocomplete onLoad={(a) => (autoRef.current = a)} onPlaceChanged={onPlaceChanged} options={{ fields: ['name', 'formatted_address', 'geometry'] }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search a landmark, park, venue…"
              aria-label="Search for a place"
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </Autocomplete>
        ) : (
          <input type="text" disabled placeholder="Loading place search…" />
        ))}
      {note && <p className="muted small qp-note">{note}</p>}
      {places.length > 0 && (
        <ul className="qp-chips">
          {places.map((p, i) => (
            <li key={`${p.lat},${p.lng}`} className="qp-chip">
              <Icon name="pin" size={13} />
              <span title={p.address ?? p.name}>{p.name}</span>
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(places.filter((_, j) => j !== i))}>
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small qp-hint">
        {places.length === 0
          ? 'Optional. A specific spot (like a landmark) makes it show up on the map and in "Near me".'
          : places.length === 1
            ? 'Add more places if this dare can be done in several spots.'
            : `${places.length} spots pinned.`}
      </p>
    </div>
  );
}
