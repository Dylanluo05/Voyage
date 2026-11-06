import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerClustererF, MarkerF } from '@react-google-maps/api';
import type { PublicSidequest, QuestPlace } from '../../types';
import { useGoogleMaps } from '../../context/GoogleMapsContext';
import { directionsLink, distanceKm, formatDistance, type LatLng } from '../../utils/geo';
import { Icon } from '../Icon';
import { SUITS } from './questMeta';

type Props = {
  /** Quests to plot. Each pinned place becomes a marker. */
  quests: PublicSidequest[];
  userPos: LatLng | null;
  onOpen: (q: PublicSidequest) => void;
};

type Pin = { key: string; quest: PublicSidequest; place: QuestPlace };

const SUIT_COLOR: Record<PublicSidequest['cardSuit'], string> = {
  spades: '#151515',
  hearts: '#e5484d',
  diamonds: '#0b76dd',
  clubs: '#10b981',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  fullscreenControl: true,
  clickableIcons: false,
  gestureHandling: 'cooperative',
};

export default function QuestMap({ quests, userPos, onOpen }: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const pins = useMemo<Pin[]>(
    () => quests.flatMap((quest) => (quest.places ?? []).map((place, i) => ({ key: `${quest._id}:${i}`, quest, place }))),
    [quests],
  );
  const selected = pins.find((p) => p.key === selectedKey) ?? null;

  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const points: LatLng[] = pins.map((p) => p.place);
    if (userPos) points.push(userPos);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [pins, userPos]);

  useEffect(() => {
    fit();
    // A filter change can remove the selected pin.
    setSelectedKey((k) => (k && pins.some((p) => p.key === k) ? k : null));
  }, [fit, pins]);

  const icon = useCallback(
    (quest: PublicSidequest, active: boolean): google.maps.Symbol => ({
      path: google.maps.SymbolPath.CIRCLE,
      scale: active ? 12 : 9,
      fillColor: SUIT_COLOR[quest.cardSuit],
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: active ? 3 : 2,
    }),
    [],
  );

  if (loadError) return <div className="qm qm--empty">The map couldn't load. Check your connection and try again.</div>;
  if (!isLoaded) return <div className="qm qm--empty">Loading map…</div>;

  return (
    <div className="qm">
      <div className="qm-canvas">
        <GoogleMap
          mapContainerClassName="qm-map"
          center={userPos ?? pins[0]?.place ?? { lat: 20, lng: 0 }}
          zoom={userPos || pins.length ? 4 : 2}
          options={MAP_OPTIONS}
          onLoad={(map) => {
            mapRef.current = map;
            fit();
          }}
          onUnmount={() => {
            mapRef.current = null;
          }}
          onClick={() => setSelectedKey(null)}
        >
          <MarkerClustererF options={{ maxZoom: 13 }}>
            {(clusterer) => (
              <>
                {pins.map((p) => (
                  <MarkerF
                    key={p.key}
                    position={p.place}
                    clusterer={clusterer}
                    title={p.quest.title}
                    icon={icon(p.quest, p.key === selectedKey)}
                    onClick={() => setSelectedKey(p.key)}
                  />
                ))}
              </>
            )}
          </MarkerClustererF>
          {userPos && (
            <MarkerF
              position={userPos}
              title="You are here"
              zIndex={1000}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
            />
          )}
        </GoogleMap>
        {pins.length === 0 && <div className="qm-none">No pinned quests match. Try clearing a filter.</div>}
      </div>

      {selected && (
        <div className={`qm-card suit-${selected.quest.cardSuit}`}>
          <div className="qm-card-main">
            <p className="qm-card-kicker">
              {selected.quest.cardRank} {SUITS[selected.quest.cardSuit].pip} · {SUITS[selected.quest.cardSuit].name} · +{selected.quest.xpReward} XP
            </p>
            <h3 className="qm-card-title">{selected.quest.title}</h3>
            <p className="qm-card-place">
              <Icon name="pin" size={14} /> {selected.place.name}
              {userPos && <span className="muted"> · {formatDistance(distanceKm(userPos, selected.place))}</span>}
            </p>
          </div>
          <div className="qm-card-actions">
            <button type="button" className="qb-btn qb-btn--solid" onClick={() => onOpen(selected.quest)}>
              Open quest
            </button>
            <a className="qb-btn qb-btn--outline" href={directionsLink(selected.place)} target="_blank" rel="noreferrer">
              Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
