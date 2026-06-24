import { useState, useEffect } from 'react';
import { Trip } from '../types';
import { ApiError } from '../api/client';
import * as tripsApi from '../api/trips';
import { Link } from 'react-router-dom';

function formatDate(s: string): string {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tripDuration(start: string, end: string): string {
    const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
    return `${days}d`;
}

export default function DiscoverPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        const fetchPublicTrips = async () => {
            try {
                setLoading(true);
                setTrips(await tripsApi.getPublicTrips());
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to load public trips');
            } finally {
                setLoading(false);
            }
        };
        fetchPublicTrips();
    }, []);

    async function onSearch() {
        try {
            setLoading(true);
            setTrips(await tripsApi.getPublicTrips(destination));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to search');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 4px' }}>Discover</h1>
                <p className="muted" style={{ margin: 0 }}>Browse real itineraries shared by travelers.</p>
            </div>

            <section className="card" style={{ marginBottom: 24 }}>
                <div className="search-row">
                    <input
                        type="text"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch()}
                        placeholder="Search by destination…"
                    />
                    <button type="button" onClick={onSearch}>Search</button>
                </div>
            </section>

            {loading && <p className="muted">Loading…</p>}
            {error && <p className="error">{error}</p>}
            {!loading && trips.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
                    <h3 style={{ marginBottom: 8 }}>No public itineraries yet</h3>
                    <p className="muted">Be the first to share a trip with the community.</p>
                </div>
            )}

            {trips.length > 0 && (
                <ul className="trip-list">
                    {trips.map(t => (
                        <li key={t._id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="trip-destination-pill">📍 {t.destination}</div>
                                    <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>{t.title}</h3>
                                    {t.description && (
                                        <p className="muted small" style={{ margin: '4px 0 0' }}>{t.description}</p>
                                    )}
                                </div>
                                <Link to={`/share/${t.shareToken}`} className="ghost small-btn" style={{ flexShrink: 0 }}>
                                    View →
                                </Link>
                            </div>
                            <div className="trip-card-footer">
                                <div className="trip-card-meta">
                                    <span className="trip-card-meta-item">
                                        📅 {formatDate(t.startDate)} – {formatDate(t.endDate)}
                                    </span>
                                    <span className="trip-card-meta-item">⏱ {tripDuration(t.startDate, t.endDate)}</span>
                                    <span className="trip-card-meta-item">📋 {t.items.length} stops</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
