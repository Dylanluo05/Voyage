import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as tripsApi from '../api/trips';
import type { Trip, NewItemInput } from '../types';
import { ApiError } from '../api/client';

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

const emptyItem: NewItemInput = {
  day: 1,
  startTime: '',
  endTime: '',
  title: '',
  notes: '',
  location: { name: '', address: '', lat: undefined, lng: undefined },
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewItemInput>(emptyItem);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    if (!id) return;
    try {
      setLoading(true);
      setTrip(await tripsApi.getTrip(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalDays = useMemo(
    () => (trip ? daysBetween(trip.startDate, trip.endDate) : 1),
    [trip]
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, Trip['items']>();
    if (!trip) return map;
    for (let d = 1; d <= totalDays; d++) map.set(d, []);
    for (const item of trip.items) {
      const arr = map.get(item.day) ?? [];
      arr.push(item);
      map.set(item.day, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
    }
    return map;
  }, [trip, totalDays]);

  async function onAddItem(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const payload: NewItemInput = {
        day: Number(draft.day),
        title: draft.title,
        startTime: draft.startTime || undefined,
        endTime: draft.endTime || undefined,
        notes: draft.notes || undefined,
        location:
          draft.location && (draft.location.name || draft.location.address || draft.location.lat !== undefined || draft.location.lng !== undefined)
            ? {
                name: draft.location.name || undefined,
                address: draft.location.address || undefined,
                lat: draft.location.lat !== undefined && !Number.isNaN(draft.location.lat) ? Number(draft.location.lat) : undefined,
                lng: draft.location.lng !== undefined && !Number.isNaN(draft.location.lng) ? Number(draft.location.lng) : undefined,
              }
            : undefined,
      };
      const updated = await tripsApi.addItem(id, payload);
      setTrip(updated);
      setDraft({ ...emptyItem, day: payload.day });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add item');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteItem(itemId: string) {
    if (!id) return;
    if (!confirm('Remove this item?')) return;
    try {
      const updated = await tripsApi.deleteItem(id, itemId);
      setTrip(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (!trip) return <div className="page">Trip not found. <Link to="/">Back</Link></div>;

  return (
    <div className="page">
      <Link to="/" className="muted">&larr; All trips</Link>
      <h1>{trip.title}</h1>
      <p className="muted">
        {trip.destination} · {new Date(trip.startDate).toLocaleDateString()} –{' '}
        {new Date(trip.endDate).toLocaleDateString()} · {totalDays} day
        {totalDays === 1 ? '' : 's'}
      </p>
      {trip.description && <p>{trip.description}</p>}

      <section className="card">
        <h2>Add itinerary item</h2>
        <form onSubmit={onAddItem} className="form grid-2">
          <label>
            Day
            <select
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              placeholder="e.g. Visit the Louvre"
            />
          </label>
          <label>
            Start time
            <input
              type="time"
              value={draft.startTime ?? ''}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              value={draft.endTime ?? ''}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            />
          </label>
          <label className="full-width">
            Notes
            <textarea
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
            />
          </label>
          <fieldset className="full-width">
            <legend>Location (optional)</legend>
            <div className="grid-2">
              <label>
                Name
                <input
                  value={draft.location?.name ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: { ...draft.location, name: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Address
                <input
                  value={draft.location?.address ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: { ...draft.location, address: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={draft.location?.lat ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: {
                        ...draft.location,
                        lat: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={draft.location?.lng ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: {
                        ...draft.location,
                        lng: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>
          {error && <div className="error full-width">{error}</div>}
          <button className="full-width" type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add item'}
          </button>
        </form>
      </section>

      <section>
        <h2>Itinerary</h2>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const items = itemsByDay.get(day) ?? [];
          return (
            <div key={day} className="day-block">
              <h3>Day {day}</h3>
              {items.length === 0 ? (
                <p className="muted">Nothing planned yet.</p>
              ) : (
                <ul className="item-list">
                  {items.map((item) => (
                    <li key={item._id} className="card">
                      <div className="row spread">
                        <div>
                          <strong>
                            {item.startTime && item.endTime
                              ? `${item.startTime} – ${item.endTime}`
                              : item.startTime ?? ''}
                          </strong>{' '}
                          {item.title}
                          {item.location?.name && (
                            <div className="muted small">
                              📍 {item.location.name}
                              {item.location.address ? ` · ${item.location.address}` : ''}
                              {item.location.lat !== undefined && item.location.lng !== undefined
                                ? ` (${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)})`
                                : ''}
                            </div>
                          )}
                          {item.notes && <p className="small">{item.notes}</p>}
                        </div>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => onDeleteItem(item._id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
