import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../types';
import { ApiError } from '../api/client';
import * as tripsApi from '../api/trips';
import { useAuth } from '../context/AuthContext';
import Reveal from '../components/Reveal';
import { Icon } from '../components/Icon';
import TripTile, { mosaicSizes } from '../components/trips/TripTile';

export default function DiscoverPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [destination, setDestination] = useState('');
  const [searched, setSearched] = useState('');

  useEffect(() => {
    tripsApi
      .getPublicTrips()
      .then(setTrips)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load public trips'))
      .finally(() => setLoading(false));
  }, []);

  async function onSearch() {
    setLoading(true);
    setError('');
    try {
      const q = destination.trim();
      setTrips(await tripsApi.getPublicTrips(q || undefined));
      setSearched(q);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to search');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qb dc">
      <header className="dc-hero">
        <h1 className="qb-title">
          <span>Trips worth</span>
          <span><em className="punch">stealing.</em></span>
        </h1>
        <p className="qb-lede">
          Real itineraries, shared by travelers. Find one that fits, see every stop, and plan your own.
        </p>
        <div className="dc-search">
          <div className="qb-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Search by destination"
              aria-label="Search by destination"
            />
            <button type="button" onClick={onSearch}>Search</button>
          </div>
          {!user && (
            <Link to="/register" className="qb-textlink">
              Start your own <Icon name="arrowRight" size={14} />
            </Link>
          )}
        </div>
      </header>

      {error && <p className="error qb-error">{error}</p>}
      {loading && <p className="muted qb-empty">Finding trips…</p>}

      {!loading && trips.length === 0 && !error && (
        <div className="qb-emptycard">
          <Icon name="compass" size={34} />
          <h3>{searched ? `No trips found for "${searched}"` : 'No public itineraries yet'}</h3>
          <p>{searched ? 'Try a different destination.' : 'Be the first to share a trip with the community.'}</p>
          {searched && (
            <button type="button" className="qb-btn qb-btn--solid" onClick={() => { setDestination(''); setSearched(''); setLoading(true); tripsApi.getPublicTrips().then(setTrips).finally(() => setLoading(false)); }}>
              Show all trips
            </button>
          )}
        </div>
      )}

      {trips.length > 0 && (
        <>
          <div className="qb-section-head">
            <h2>{searched ? `Trips to ${searched}` : 'Fresh itineraries'}</h2>
            <span>{trips.length} {trips.length === 1 ? 'itinerary' : 'itineraries'}</span>
          </div>
          <Reveal as="div" className="qb-mosaic" variant="up" stagger>
            {(() => { const sizes = mosaicSizes(trips.length); return trips.map((t, i) => (
              <TripTile key={t._id} trip={t} href={`/share/${t.shareToken}`} size={sizes[i]} showAuthor />
            )); })()}
          </Reveal>
        </>
      )}
    </div>
  );
}
