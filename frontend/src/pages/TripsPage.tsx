import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as tripsApi from '../api/trips';
import type { Trip } from '../types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tripDuration(start: string, end: string): string {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  useEffect(() => { refresh(); }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date');
      return;
    }
    setCreating(true);
    try {
      await tripsApi.createTrip({ title, destination, startDate, endDate, description: description || undefined });
      setTitle(''); setDestination(''); setStartDate(''); setEndDate(''); setDescription('');
      setShowForm(false);
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
      setTrips(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete trip');
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Your trips</h1>
          {!loading && trips.length > 0 && (
            <p className="muted small" style={{ margin: '4px 0 0' }}>{trips.length} trip{trips.length !== 1 ? 's' : ''} planned</p>
          )}
        </div>
        <button type="button" onClick={() => setShowForm(f => !f)} className={showForm ? 'ghost' : ''}>
          {showForm ? 'Cancel' : '+ New trip'}
        </button>
      </div>

      {showForm && (
        <section className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ marginTop: 0 }}>New trip</h2>
          <form onSubmit={onCreate} className="form grid-2">
            <label>
              Title
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tokyo Summer 2025" required />
            </label>
            <label>
              Destination
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Tokyo, Japan" required />
            </label>
            <label>
              Start date
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </label>
            <label>
              End date
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </label>
            <label className="full-width">
              Description <span className="muted">(optional)</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's this trip about?" />
            </label>
            {error && <div className="error full-width">{error}</div>}
            <button className="full-width" type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create trip'}
            </button>
          </form>
        </section>
      )}

      <section>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : trips.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
            <h3 style={{ marginBottom: 8 }}>No trips yet</h3>
            <p className="muted" style={{ marginBottom: 20 }}>Create your first trip and start planning your adventure.</p>
            <button type="button" onClick={() => setShowForm(true)}>+ Create trip</button>
          </div>
        ) : (
          <ul className="trip-list">
            {trips.map(trip => {
              const isOwner = trip.owner._id === user?.id;
              const duration = tripDuration(trip.startDate, trip.endDate);
              return (
                <li key={trip._id} className="card">
                  <div className="trip-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="trip-destination-pill">📍 {trip.destination}</div>
                      <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>
                        <Link to={`/trips/${trip._id}`}>{trip.title}</Link>
                        {!isOwner && <span className="collab-badge">Shared</span>}
                      </h3>
                      {trip.description && (
                        <p className="muted small" style={{ margin: '4px 0 0' }}>{trip.description}</p>
                      )}
                    </div>
                    {isOwner && (
                      <button type="button" onClick={() => onDelete(trip._id)} className="danger small-btn" style={{ flexShrink: 0 }}>
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="trip-card-footer">
                    <div className="trip-card-meta">
                      <span className="trip-card-meta-item">📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                      <span className="trip-card-meta-item">⏱ {duration}</span>
                      <span className="trip-card-meta-item">📋 {trip.items.length} item{trip.items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <Link to={`/trips/${trip._id}`} className="ghost small-btn">Open →</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
