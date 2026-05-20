import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, OverlayView, PolylineF } from '@react-google-maps/api';
import type { ItineraryItem } from '../types';

interface TripMapProps {
  items: ItineraryItem[];
}

type MapLocation = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  address?: string;
  day: number;
  position: number;
  imageUrl?: string;
};

function getPopupOffset() {
  return { x: 0, y: 0 };
}

const ROUTE_LINE_OPTIONS: google.maps.PolylineOptions = {
  strokeColor: '#00d4c8',
  strokeWeight: 3,
  strokeOpacity: 0.85,
  geodesic: true,
};

export default function TripMap({ items }: TripMapProps) {
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const geocodedIdsRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const toGeocode = items.filter(
      (item) =>
        (item.location?.name || item.location?.address) &&
        !(item.location?.lat != null && item.location?.lng != null) &&
        !geocodedIdsRef.current.has(item._id)
    );
    if (toGeocode.length === 0) return;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const service = new google.maps.places.PlacesService(container);
    let active = true;

    toGeocode.forEach((item) => {
      geocodedIdsRef.current.add(item._id);
      const query = [item.location!.name, item.location!.address].filter(Boolean).join(' ');
      service.findPlaceFromQuery(
        { query, fields: ['geometry'] },
        (results, status) => {
          if (!active) return;
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setGeocodedLocations((prev) => ({
              ...prev,
              [item._id]: { lat: loc.lat(), lng: loc.lng() },
            }));
          }
        }
      );
    });

    return () => {
      active = false;
      if (document.body.contains(container)) document.body.removeChild(container);
    };
  }, [items]);

  const locations = useMemo<MapLocation[]>(() => {
    return items
      .filter((item) => {
        if (item.location?.lat != null && item.location?.lng != null) return true;
        return !!geocodedLocations[item._id];
      })
      .map((item) => {
        const coords =
          item.location?.lat != null && item.location?.lng != null
            ? { lat: item.location.lat as number, lng: item.location.lng as number }
            : geocodedLocations[item._id];
        return {
          id: item._id,
          title: item.title,
          lat: coords.lat,
          lng: coords.lng,
          address: item.location?.address,
          day: item.day,
          position: item.position ?? 0,
          imageUrl: item.imageUrl,
        };
      });
  }, [items, geocodedLocations]);

  const days = useMemo(
    () => [...new Set(locations.map((l) => l.day))].sort((a, b) => a - b),
    [locations]
  );

  const filteredLocations = useMemo(() => {
    if (selectedDay === null) return locations;
    return [...locations]
      .filter((l) => l.day === selectedDay)
      .sort((a, b) => a.position - b.position);
  }, [locations, selectedDay]);

  const center = useMemo(() => {
    const src = filteredLocations.length > 0 ? filteredLocations : locations;
    if (src.length === 0) return { lat: 40.7128, lng: -74.006 };
    return {
      lat: src.reduce((s, l) => s + l.lat, 0) / src.length,
      lng: src.reduce((s, l) => s + l.lng, 0) / src.length,
    };
  }, [filteredLocations, locations]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || filteredLocations.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    filteredLocations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
    mapRef.current.fitBounds(bounds);
  }, [filteredLocations, mapLoaded]);

  const routePath = useMemo(
    () =>
      selectedDay !== null
        ? filteredLocations.map((l) => ({ lat: l.lat, lng: l.lng }))
        : [],
    [filteredLocations, selectedDay]
  );

  return (
    <div id="map-section" className="card">
      <h2>Map</h2>

      {days.length > 1 && (
        <div className="map-day-filter">
          <button
            className={`map-day-btn${selectedDay === null ? ' active' : ''}`}
            onClick={() => setSelectedDay(null)}
          >
            All
          </button>
          {days.map((d) => (
            <button
              key={d}
              className={`map-day-btn${selectedDay === d ? ' active' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '400px' }}
        center={center}
        zoom={filteredLocations.length === 1 ? 14 : 12}
        onLoad={onMapLoad}
        onClick={() => setSelected(null)}
      >
        {mapLoaded && filteredLocations.map((loc, idx) => (
          <MarkerF
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            label={
              selectedDay !== null
                ? { text: String(idx + 1), color: '#08090e', fontWeight: '700', fontSize: '12px' }
                : undefined
            }
            onClick={(e) => {
              e.stop();
              setSelected(loc);
            }}
          />
        ))}

        {mapLoaded && routePath.length >= 2 && (
          <PolylineF path={routePath} options={ROUTE_LINE_OPTIONS} />
        )}

        {mapLoaded && selected && (
          <OverlayView
            position={{ lat: selected.lat, lng: selected.lng }}
            mapPaneName="floatPane"
            getPixelPositionOffset={getPopupOffset}
          >
            <div className="map-popup">
              <button
                className="map-popup-close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt={selected.title} className="map-popup-img" />
              )}
              <strong className="map-popup-title">{selected.title}</strong>
              <p className="map-popup-meta">Day {selected.day}</p>
              {selected.address && <p className="map-popup-meta">{selected.address}</p>}
            </div>
          </OverlayView>
        )}
      </GoogleMap>
    </div>
  );
}
