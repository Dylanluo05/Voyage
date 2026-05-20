import { useEffect, useMemo, useState } from 'react';
import type { Trip, Recommendation, NewItemInput } from '../types';
import * as tripsApi from '../api/trips';
import { ApiError } from '../api/client';
import Lightbox from './Lightbox';
import { compressImageFromUrl } from '../utils/image';

interface Props {
  trip: Trip;
  totalDays: number;
  onAdd: (item: NewItemInput) => Promise<void>;
}

type Category = Recommendation['category'];

const ALL_CATEGORIES: Category[] = ['food', 'activity', 'attraction'];

const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food',
  activity: 'Activity',
  attraction: 'Attraction',
};

const PREFS_KEY = 'voyage_rec_categories';

function loadSavedCategories(): Set<Category> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed: Category[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch { }
  return new Set(ALL_CATEGORIES);
}

export default function RecommendationsPanel({ trip, totalDays, onAdd }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [coords, setCoords] = useState<Record<number, { lat: number; lng: number }>>({});
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Record<number, number>>({});
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(loadSavedCategories);

  function toggleCategory(cat: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size === 1) return prev; // keep at least one selected
        next.delete(cat);
      } else {
        next.add(cat);
      }
      localStorage.setItem(PREFS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  useEffect(() => {
    if (recommendations.length === 0) return;
    setPhotos({});
    setCoords({});
    let active = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const service = new google.maps.places.PlacesService(container);
    recommendations.forEach((rec, idx) => {
      const primaryQuery = rec.location?.name
        ? `${rec.location.name} ${rec.location.address ?? ''}`.trim()
        : null;
      const fallbackQuery = `${rec.title} ${trip.destination}`;

      function tryFallback() {
        if (!active) return;
        service.findPlaceFromQuery(
          { query: fallbackQuery, fields: ['photos'] },
          (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
            if (!active || status !== google.maps.places.PlacesServiceStatus.OK || !results?.[0]?.photos?.[0]) return;
            const url = results[0].photos![0].getUrl({ maxWidth: 1600, maxHeight: 1000 });
            setPhotos((prev) => ({ ...prev, [idx]: url }));
          }
        );
      }

      if (!primaryQuery) {
        tryFallback();
        return;
      }

      service.findPlaceFromQuery(
        { query: primaryQuery, fields: ['photos', 'geometry'] },
        (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (!active) return;
          const place = results?.[0];
          const ok = status === google.maps.places.PlacesServiceStatus.OK && !!place;

          if (ok && place.photos?.[0]) {
            const url = place.photos[0].getUrl({ maxWidth: 1600, maxHeight: 1000 });
            setPhotos((prev) => ({ ...prev, [idx]: url }));
          } else {
            tryFallback();
          }

          if (ok && place?.geometry?.location) {
            setCoords((prev) => ({
              ...prev,
              [idx]: { lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng() },
            }));
          }
        }
      );
    });
    return () => {
      active = false;
      if (document.body.contains(container)) document.body.removeChild(container);
    };
  }, [recommendations]);

  const existingTitles = useMemo(
    () => new Set(trip.items.map(i => i.title.toLowerCase())),
    [trip.items]
  );

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const excludeTitles = recommendations.map(r => r.title);
      const recs = await tripsApi.getRecommendations(trip._id, excludeTitles);
      setRecommendations(recs);
      setAddedIndices(new Set());
      const days: Record<number, number> = {};
      recs.forEach((rec, i) => {
        days[i] = Math.min(rec.suggestedDay ?? 1, totalDays);
      });
      setSelectedDays(days);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(rec: Recommendation, idx: number) {
    setAddingIdx(idx);
    try {
      let imageUrl: string | undefined = photos[idx] || undefined;
      if (imageUrl) {
        try {
          imageUrl = await compressImageFromUrl(imageUrl);
        } catch {
          // CORS block — keep the raw URL as fallback; onError in ItineraryItemCard hides it if it expires
        }
      }
      await onAdd({
        day: selectedDays[idx] ?? Math.min(rec.suggestedDay ?? 1, totalDays),
        title: rec.title,
        startTime: rec.suggestedStartTime || undefined,
        endTime: rec.suggestedEndTime || undefined,
        notes: rec.description,
        imageUrl,
        category: rec.category,
        location: rec.location
          ? {
            name: rec.location.name,
            address: rec.location.address,
            lat: coords[idx]?.lat,
            lng: coords[idx]?.lng,
          }
          : undefined,
      });
      setAddedIndices((prev) => new Set(prev).add(idx));
    } catch {
      setError('Failed to add item');
    } finally {
      setAddingIdx(null);
    }
  }

  const visibleRecs = recommendations.filter((rec) => activeCategories.has(rec.category));

  return (
    <section id="ai-recommendations-section" className="card">
      <div className="row spread" style={{ alignItems: 'center', marginBottom: recommendations.length ? 12 : 0 }}>
        <div>
          <h2 style={{ margin: 0 }}>AI Recommendations</h2>
          {!recommendations.length && !loading && (
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              Get personalized suggestions for {trip.destination}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={fetchRecommendations}
          disabled={loading}
          className={recommendations.length ? 'ghost' : ''}
        >
          {loading ? 'Generating…' : recommendations.length ? 'Regenerate' : 'Get recommendations'}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="rec-filter-row">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`rec-filter-chip rec-filter-chip--${cat}${activeCategories.has(cat) ? ' active' : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {visibleRecs.length > 0 && (
        <div className="rec-grid">
          {recommendations.map((rec, idx) => {
            if (!activeCategories.has(rec.category)) return null;
            const added = addedIndices.has(idx) || existingTitles.has(rec.title.toLowerCase());
            return (
              <div key={idx} className={`rec-card${added ? ' rec-card--added' : ''}`}>
                {photos[idx] && (
                  <>
                    <img
                      src={photos[idx]}
                      alt={rec.title}
                      className="rec-img"
                      onClick={() => setLightboxIdx(idx)}
                      onError={() => setPhotos((prev) => { const n = { ...prev }; delete n[idx]; return n; })}
                    />
                    {lightboxIdx === idx && (
                      <Lightbox
                        src={photos[idx]}
                        alt={rec.title}
                        onClose={() => setLightboxIdx(null)}
                      />
                    )}
                  </>
                )}
                <div className="row spread" style={{ alignItems: 'center', marginBottom: 8 }}>
                  <span className={`rec-badge rec-badge--${rec.category}`}>
                    {CATEGORY_LABELS[rec.category]}
                  </span>
                  <label className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <span className="muted small">Day</span>
                    <select
                      value={selectedDays[idx] ?? 1}
                      onChange={(e) =>
                        setSelectedDays((prev) => ({ ...prev, [idx]: Number(e.target.value) }))
                      }
                      className="rec-day-select"
                      disabled={added}
                    >
                      {Array.from({ length: totalDays }, (_, d) => d + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <strong style={{ display: 'block', marginBottom: 4 }}>{rec.title}</strong>
                <p className="small muted" style={{ margin: '0 0 8px' }}>{rec.description}</p>

                {(rec.suggestedStartTime || rec.location?.name || rec.estimatedCost) && (
                  <p className="muted small" style={{ margin: '0 0 12px' }}>
                    {rec.suggestedStartTime && rec.suggestedEndTime
                      ? `${rec.suggestedStartTime} – ${rec.suggestedEndTime}`
                      : rec.suggestedStartTime ?? ''}
                    {rec.location?.name && (
                      <>{rec.suggestedStartTime ? ' · ' : ''}📍 {rec.location.name}</>
                    )}
                    {rec.estimatedCost && (
                      <> · 💰 {rec.estimatedCost}</>
                    )}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleAdd(rec, idx)}
                  disabled={addingIdx === idx || added}
                  className={`full-width${added ? ' ghost' : ''}`}
                  style={{ marginTop: 'auto' }}
                >
                  {added ? '✓ Added' : addingIdx === idx ? 'Adding…' : 'Add to itinerary'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
