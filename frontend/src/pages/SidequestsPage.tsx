import { useState, useEffect } from 'react';
import { PublicSidequest, Trip } from '../types';
import * as tripsApi from '../api/trips';
import * as sidequestsApi from '../api/publicSidequests';
import { ApiError } from '../api/client';

export default function SidequestsPage() {
    const [sidequests, setSidequests] = useState<PublicSidequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTripId, setSelectedTripId] = useState('');

    useEffect(() => {
        const fetchPublicSidequests = async () => {
            try {
                setLoading(true);
                setSidequests(await sidequestsApi.listPublicSidequests());
                setTrips(await tripsApi.listTrips());
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Failed to load public sidequests');
            } finally {
                setLoading(false);
            }
        };
        fetchPublicSidequests();
    }, []);

    useEffect(() => {
        if (trips.length > 0 && !selectedTripId) {
            setSelectedTripId(trips[0]._id);
        }
    }, [trips]);

    async function onSearch() {
        try {
            setLoading(true);
            setSidequests(await sidequestsApi.listPublicSidequests(locationQuery));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : `Failed to load public sidequests for location: ${locationQuery}`);
        } finally {
            setLoading(false);
        }
    }

    async function onComplete(id: string) {
        try {
            const updated = await sidequestsApi.completePublicSidequest(id, photoUrl);
            setSidequests(prev => prev.map(s => s._id === id ? updated : s));
            setCompletingId(null);
            setPhotoUrl('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to complete public sidequest');
        }
    }

    async function onAddToTrip(id: string) {
        try {
            await sidequestsApi.addToTrip(id, selectedTripId);
            setAddingToTripId(null);
            setSelectedTripId(trips[0]._id);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to add public sidequest to trip');
        }
    }

    return (
        <div className="page">
            <h1>Public Sidequests</h1>
            <section className="card">
                <div className="row" style={{ gap: '8px' }}>
                    <input type="text" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Location..." />
                    <button type="button" onClick={onSearch}>Search</button>
                </div>
            </section>
            <section style={{ marginTop: '20px' }}>
                {loading && <p>Loading...</p>}
                {error && <p className="error">{error}</p>}
                {!loading && sidequests.length === 0 && <p className="muted" style={{ marginTop: '16px' }}>No sidequests available at this time...</p>}
                {sidequests.length > 0 && (
                    <ul className="sidequest-list">
                        {sidequests.map(s => {
                            return (
                                <li key={s._id} className="card">
                                    <div className="row spread">
                                        <div>
                                            <h3 style={{ margin: '0 0 4px' }}>{s.title}</h3>
                                            {s.location && <p className="muted small">{s.location}</p>}
                                            <p className="muted small">{s.createdBy.userName}</p>
                                            <p className="muted small">{s.completions.length} completion{s.completions.length !== 1 ? 's' : ''}</p>
                                            {s.completions.map(c => (
                                                <img key={c.userId} src={c.photoUrl} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                                            ))}
                                        </div>
                                        <div>
                                            <button type="button" onClick={() => setCompletingId(s._id)} className="ghost small-btn">Complete</button>
                                            <button type="button" onClick={() => setAddingToTripId(s._id)} className="ghost small-btn">Add to Trip</button>
                                        </div>
                                    </div>
                                    {completingId === s._id && (
                                        <div className="row" style={{ gap: '8px' }}>
                                            <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="url of image..." />
                                            <button type="button" onClick={() => onComplete(s._id)}>Confirm</button>
                                        </div>
                                    )}
                                    {addingToTripId === s._id && (
                                        <div className="row" style={{ gap: '8px' }}>
                                            <select value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)}>
                                                {trips.map(t => (
                                                    <option key={t._id} value={t._id}>{t.title}</option>
                                                ))}
                                            </select>
                                            <button type="button" onClick={() => onAddToTrip(s._id)}>Confirm</button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}