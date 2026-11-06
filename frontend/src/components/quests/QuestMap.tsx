import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, InfoWindowF, MarkerF } from '@react-google-maps/api';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
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

const pinIcon = (suit: PublicSidequest['cardSuit'], active: boolean): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: active ? 12 : 9,
  fillColor: SUIT_COLOR[suit],
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: active ? 3 : 2,
});

export default function QuestMap({ quests, userPos, onOpen }: Props) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const allPins = useMemo<Pin[]>(
    () => quests.flatMap((quest) => (quest.places ?? []).map((place, i) => ({ key: `${quest._id}:${i}`, quest, place }))),
    [quests],
  );

  // The page hands over a new array on every render. Markers are only rebuilt when the set of pins
  // really changes, so a parent re-render never makes the map flicker or lose its popup.
  const pinSignature = allPins.map((p) => `${p.key}@${p.place.lat},${p.place.lng}:${p.quest.cardSuit}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pins = useMemo(() => allPins, [pinSignature]);
  const selected = allPins.find((p) => p.key === selectedKey) ?? null;

  const fit = useCallback(() => {
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
  }, [map, pins, userPos]);

  useEffect(() => {
    fit();
  }, [fit]);

  // A filter change can remove the pin that is currently open.
  useEffect(() => {
    setSelectedKey((k) => (k && pins.some((p) => p.key === k) ? k : null));
  }, [pins]);

  // Own the markers and the clusterer directly and tear both down on cleanup, so React StrictMode's
  // mount/unmount/mount cycle (dev) can never leave the map without pins.
  useEffect(() => {
    if (!map) return;
    const markers = pins.map((p) => {
      const marker = new google.maps.Marker({ position: p.place, title: p.quest.title, icon: pinIcon(p.quest.cardSuit, false) });
      marker.addListener('click', () => setSelectedKey(p.key));
      markersRef.current.set(p.key, marker);
      return marker;
    });
    const clusterer = new MarkerClusterer({ map, markers, algorithm: new SuperClusterAlgorithm({ maxZoom: 13, radius: 80 }) });
    return () => {
      clusterer.clearMarkers();
      clusterer.setMap(null);
      markers.forEach((m) => {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      markersRef.current.clear();
    };
  }, [map, pins]);

  // Highlight the open pin.
  useEffect(() => {
    pins.forEach((p) => markersRef.current.get(p.key)?.setIcon(pinIcon(p.quest.cardSuit, p.key === selectedKey)));
  }, [pins, selectedKey]);

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
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          onClick={() => setSelectedKey(null)}
        >
          {selected && (
            <InfoWindowF
              position={selected.place}
              onCloseClick={() => setSelectedKey(null)}
              options={{ pixelOffset: new google.maps.Size(0, -14), maxWidth: 280 }}
            >
              <div className={`qm-pop suit-${selected.quest.cardSuit}`}>
                <p className="qm-pop-kicker">
                  {selected.quest.cardRank} {SUITS[selected.quest.cardSuit].pip} · {SUITS[selected.quest.cardSuit].name} · +{selected.quest.xpReward} XP
                </p>
                <h3 className="qm-pop-title">{selected.quest.title}</h3>
                <p className="qm-pop-place">
                  <Icon name="pin" size={13} /> {selected.place.name}
                  {userPos && <span> · {formatDistance(distanceKm(userPos, selected.place))}</span>}
                </p>
                <div className="qm-pop-actions">
                  <button type="button" className="qm-pop-btn qm-pop-btn--solid" onClick={() => onOpen(selected.quest)}>
                    Open quest
                  </button>
                  <a className="qm-pop-btn" href={directionsLink(selected.place)} target="_blank" rel="noreferrer">
                    Directions
                  </a>
                </div>
              </div>
            </InfoWindowF>
          )}
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
    </div>
  );
}
