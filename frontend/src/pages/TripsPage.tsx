import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as tripsApi from '../api/trips';
import type { Trip } from '../types';
import { ApiError } from '../api/client';

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString();
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      setLoading(true);
      setTrips(await tripsApi.listTrips());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await tripsApi.createTrip({
        title,
        destination,
        startDate,
        endDate,
        description: description || undefined,
      });
      setTitle('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this trip?')) return;
    try {
      await tripsApi.deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete trip');
    }
  }

  return (
    <div className="page">
      <h1>Your trips</h1>

      <section className="card">
        <h2>New trip</h2>
        <form onSubmit={onCreate} className="form grid-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Destination
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className="full-width">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </label>
          {error && <div className="error full-width">{error}</div>}
          <button className="full-width" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create trip'}
          </button>
        </form>
      </section>

      <section>
        {loading ? (
          <p>Loading…</p>
        ) : trips.length === 0 ? (
          <p className="muted">No trips yet — create one above.</p>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => (
              <li key={trip._id} className="card">
                <div className="row spread">
                  <div>
                    <h3>
                      <Link to={`/trips/${trip._id}`}>{trip.title}</Link>
                    </h3>
                    <p className="muted">
                      {trip.destination} · {formatDate(trip.startDate)} –{' '}
                      {formatDate(trip.endDate)}
                    </p>
                    {trip.description && <p>{trip.description}</p>}
                    <p className="muted small">
                      {trip.items.length} itinerary item
                      {trip.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(trip._id)}
                    className="danger"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
