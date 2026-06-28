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

function getTripStatus(startDate: string, endDate: string): 'upcoming' | 'ongoing' | 'past' {
  const now = Date.now();
  if (now < new Date(startDate).getTime()) return 'upcoming';
  if (now > new Date(endDate).getTime()) return 'past';
  return 'ongoing';
}

const DEST_PALETTES = [
  ['#0891b2', '#0e7490'],
  ['#7c3aed', '#6d28d9'],
  ['#dc2626', '#f97316'],
  ['#059669', '#0891b2'],
  ['#d97706', '#dc2626'],
  ['#db2777', '#7c3aed'],
  ['#2563eb', '#0891b2'],
];

function destPalette(destination: string): [string, string] {
  let h = 0;
  for (let i = 0; i < destination.length; i++) h = (h * 31 + destination.charCodeAt(i)) & 0xffffffff;
  const [a, b] = DEST_PALETTES[Math.abs(h) % DEST_PALETTES.length];
  return [a, b];
}

const STATUS_META = {
  upcoming: { label: 'Upcoming', color: '#0891b2', bg: 'rgba(8,145,178,0.12)', border: 'rgba(8,145,178,0.3)' },
  ongoing:  { label: 'Ongoing',  color: '#059669', bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)' },
  past:     { label: 'Past',     color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
};

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
    if (new Date(endDate) < new Date(startDate)) { setError('End date must be on or after start date'); return; }
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

  const upcoming = trips.filter(t => getTripStatus(t.startDate, t.endDate) === 'upcoming');
  const ongoing  = trips.filter(t => getTripStatus(t.startDate, t.endDate) === 'ongoing');
  const past     = trips.filter(t => getTripStatus(t.startDate, t.endDate) === 'past');

  return (
    <div className="page">
      <div className="trips-page-header">
        <div>
          <h1 className="trips-page-title">Your Trips</h1>
          {!loading && trips.length > 0 && (
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              {ongoing.length > 0 && <span className="trips-live-dot" />}
              {trips.length} trip{trips.length !== 1 ? 's' : ''}
              {ongoing.length > 0 && ` · ${ongoing.length} ongoing`}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setShowForm(f => !f)} className={showForm ? 'ghost' : ''}>
          {showForm ? '✕ Cancel' : '+ New Trip'}
        </button>
      </div>

      {showForm && (
        <section className="card trips-create-form" style={{ marginBottom: 28 }}>
          <h2 style={{ marginTop: 0, marginBottom: 20 }}>New Trip</h2>
          <form onSubmit={onCreate} className="form grid-2">
            <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tokyo Summer 2025" required /></label>
            <label>Destination<input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Tokyo, Japan" required /></label>
            <label>Start date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></label>
            <label>End date<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required /></label>
            <label className="full-width">Description <span className="muted">(optional)</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What's this trip about?" />
            </label>
            {error && <div className="error full-width">{error}</div>}
            <button className="full-width" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Trip'}</button>
          </form>
        </section>
      )}

      {loading && <p className="muted">Loading…</p>}
      {error && !showForm && <p className="error">{error}</p>}

      {!loading && trips.length === 0 && (
        <div className="trips-empty">
          <div className="trips-empty-icon">✈️</div>
          <h3>No trips yet</h3>
          <p className="muted">Create your first trip and start planning your next adventure.</p>
          <button type="button" onClick={() => setShowForm(true)}>+ Create Trip</button>
        </div>
      )}

      {[{ label: 'Ongoing', items: ongoing }, { label: 'Upcoming', items: upcoming }, { label: 'Past', items: past }]
        .filter(g => g.items.length > 0)
        .map(group => (
          <section key={group.label} className="trips-group">
            <h2 className="trips-group-label">{group.label}</h2>
            <ul className="trips-grid">
              {group.items.map(trip => {
                const isOwner = trip.owner._id === user?.id;
                const duration = tripDuration(trip.startDate, trip.endDate);
                const status = getTripStatus(trip.startDate, trip.endDate);
                const sm = STATUS_META[status];
                const [c1, c2] = destPalette(trip.destination);
                const collabCount = trip.collaborators?.length ?? 0;
                return (
                  <li key={trip._id} className="trip-card-v2">
                    <div className="trip-card-banner" style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
                      <div className="trip-card-banner-dest">{trip.destination}</div>
                      <span className="trip-status-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                        {status === 'ongoing' && <span className="trip-status-pulse" />}
                        {sm.label}
                      </span>
                    </div>

                    <div className="trip-card-body-v2">
                      <div className="trip-card-top">
                        <div>
                          <h3 className="trip-card-title-v2">
                            <Link to={`/trips/${trip._id}`}>{trip.title}</Link>
                            {!isOwner && <span className="collab-badge">Shared</span>}
                          </h3>
                          {trip.description && <p className="trip-card-desc">{trip.description}</p>}
                        </div>
                        {isOwner && (
                          <button type="button" onClick={() => onDelete(trip._id)} className="danger small-btn trip-delete-btn">Delete</button>
                        )}
                      </div>

                      <div className="trip-card-chips">
                        <span className="trip-chip">📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                        <span className="trip-chip">⏱ {duration}</span>
                        <span className="trip-chip">📋 {trip.items.length} item{trip.items.length !== 1 ? 's' : ''}</span>
                        {collabCount > 0 && <span className="trip-chip">👥 {collabCount + 1} people</span>}
                      </div>

                      <div className="trip-card-actions">
                        <Link to={`/trips/${trip._id}`} className="trip-open-btn" style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
                          Open Trip →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
