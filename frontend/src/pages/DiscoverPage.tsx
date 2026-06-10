import { useState, useEffect } from 'react';
import { Trip } from '../types';
import { ApiError } from '../api/client';
import * as tripsApi from '../api/trips';
import { Link } from 'react-router-dom';

function formatDate(s: string): string {
    return new Date(s).toLocaleDateString();
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
            setError(err instanceof ApiError ? err.message : 'Failed to load public trips');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <h1>Discover Itineraries</h1>
            <section className="card">
                <div className="row" style={{ gap: '8px' }}>
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination..." />
                    <button type="button" onClick={onSearch}>Search</button>
                </div>
            </section>
            <section style={{ marginTop: '20px' }}>
                {loading && <p>Loading...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && trips.length === 0 && <p className="muted" style={{ marginTop: '16px' }}>No public itineraries</p>}
                {trips.length > 0 && (
                    <ul className="trip-list">
                        {trips.map(t => {
                            return (
                                <li key={t._id} className="card">
                                    <div className="row spread">
                                        <div>
                                            <h3 style={{ margin: '0 0 4px' }}>{t.title}</h3>
                                            <p className="muted">{t.destination} · {formatDate(t.startDate)} – {formatDate(t.endDate)}</p>
                                            {t.description && <p className="small" style={{ margin: '4px 0 0' }}>{t.description}</p>}
                                            <p className="muted small">{t.items.length} itinerary item{t.items.length === 1 ? '' : 's'}</p>
                                        </div>
                                        <Link to={`/share/${t.shareToken}`} className="ghost small-btn">View</Link>
                                    </div>
                                </li>
                            );

                        })}
                    </ul>
                )}
            </section>
        </div >
    );
}