import { useState, useEffect } from 'react';
import { Trip } from '../types';
import { ApiError } from '../api/client';
import * as tripsApi from '../api/trips';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { Icon } from '../components/Icon';

function formatDate(s: string): string {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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
        <div className="page discover-page">
            <div className="page-head">
                <div className="page-head__lead">
                    <h1>Discover</h1>
                    <span className="page-head__sub">
                        {trips.length > 0
                            ? <><CountUp value={trips.length} /> real {trips.length === 1 ? 'itinerary' : 'itineraries'}, shared by travelers</>
                            : 'Real itineraries, shared by travelers'}
                    </span>
                </div>
                <div className="page-head__actions search-row search-row--glass">
                    <input
                        className="glass-field"
                        type="text"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onSearch()}
                        placeholder="Search by destination…"
                    />
                    <button type="button" className="btn btn--primary" onClick={onSearch}>Search</button>
                </div>
            </div>

            {loading && <p className="muted">Loading…</p>}
            {error && <p className="error">{error}</p>}
            {!loading && trips.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ marginBottom: 12, color: 'var(--accent)' }}><Icon name="compass" size={40} /></div>
                    <h3 style={{ marginBottom: 8 }}>No public itineraries yet</h3>
                    <p className="muted">Be the first to share a trip with the community.</p>
                </div>
            )}

            {trips.length > 0 && (
                <Reveal as="ul" className="trip-list" variant="scale" stagger>
                    {trips.map(t => (
                        <li key={t._id} className="glass-card glass--raised">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="trip-destination-pill"><Icon name="pin" size={13} /> {t.destination}</div>
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
                                        <Icon name="calendar" size={13} /> {formatDate(t.startDate)} - {formatDate(t.endDate)}
                                    </span>
                                    <span className="trip-card-meta-item"><Icon name="clock" size={13} /> {tripDuration(t.startDate, t.endDate)}</span>
                                    <span className="trip-card-meta-item"><Icon name="list" size={13} /> {t.items.length} stops</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </Reveal>
            )}
        </div>
    );
}
