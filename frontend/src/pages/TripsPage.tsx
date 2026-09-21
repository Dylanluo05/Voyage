import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as tripsApi from '../api/trips';
import type { Trip } from '../types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Reveal from '../components/Reveal';
import { Icon } from '../components/Icon';
import TripTile, { TripCover, mosaicSizes, tripDays, tripStatus, type TripStatus } from '../components/trips/TripTile';

const utcDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
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
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete trip');
    }
  }

  const groups = useMemo(() => {
    const by: Record<TripStatus, Trip[]> = { ongoing: [], upcoming: [], past: [] };
    trips.forEach((t) => by[tripStatus(t.startDate, t.endDate)].push(t));
    by.upcoming.sort((a, b) => utcDay(a.startDate) - utcDay(b.startDate));
    by.past.sort((a, b) => utcDay(b.startDate) - utcDay(a.startDate));
    return by;
  }, [trips]);

  // The hero highlights whatever is happening now, otherwise the soonest upcoming trip.
  const next = groups.ongoing[0] ?? groups.upcoming[0] ?? null;
  const nextIsLive = !!next && groups.ongoing[0] === next;
  const daysUntil = next ? Math.round((utcDay(next.startDate) - utcDay(new Date().toISOString())) / 86_400_000) : 0;

  return (
    <div className="qb tp">
      <header className={`tp-hero${next ? '' : ' tp-hero--solo'}`}>
        <div>
          <h1 className="qb-title">
            <span>Your</span>
            <span><em className="punch">trips.</em></span>
          </h1>
          <p className="qb-lede">
            {loading
              ? 'Loading your trips…'
              : trips.length === 0
                ? 'Nothing planned yet. Start one and get the crew in.'
                : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}${groups.ongoing.length ? `, ${groups.ongoing.length} happening now` : ''}.`}
          </p>
          <div className="qb-cta">
            <button type="button" className={`qb-btn ${showForm ? 'qb-btn--outline' : 'qb-btn--solid'}`} onClick={() => setShowForm((f) => !f)}>
              {showForm ? <><Icon name="close" size={16} /> Cancel</> : <><Icon name="plus" size={16} /> New trip</>}
            </button>
            <Link to="/discover" className="qb-textlink">
              Get ideas <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>

        {next && (
          <Link to={`/trips/${next._id}`} className="tp-next" aria-label={`Open ${next.title}`}>
            <TripCover trip={next} className="tp-next-cover">
              <span className="tp-next-kicker">{nextIsLive ? 'Happening now' : 'Next up'}</span>
              <span className="tp-next-body">
                <b className="tp-next-count">
                  {nextIsLive ? 'Day' : daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                  {nextIsLive && <> {Math.min(tripDays(next.startDate, new Date().toISOString()), tripDays(next.startDate, next.endDate))}</>}
                </b>
                <span className="tp-next-title">{next.title}</span>
                <span className="tp-next-dest"><Icon name="pin" size={15} weight="fill" /> {next.destination}</span>
              </span>
              <span className="tp-next-go"><Icon name="arrowUpRight" size={20} /></span>
            </TripCover>
          </Link>
        )}
      </header>

      {showForm && (
        <section className="tp-form">
          <h2>Where to?</h2>
          <form onSubmit={onCreate} className="form grid-2">
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tokyo Summer 2026" required /></label>
            <label>Destination<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Tokyo, Japan" required /></label>
            <label>Start date<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></label>
            <label>End date<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></label>
            <label className="full-width">Description <span className="muted">(optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's this trip about?" />
            </label>
            {error && <div className="error full-width">{error}</div>}
            <button className="full-width" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create trip'}</button>
          </form>
        </section>
      )}

      {error && !showForm && <p className="error qb-error">{error}</p>}

      {!loading && trips.length === 0 && (
        <div className="qb-emptycard">
          <Icon name="plane" size={34} />
          <h3>No trips yet</h3>
          <p>Create your first trip and start planning your next adventure.</p>
          <button type="button" className="qb-btn qb-btn--solid" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={16} /> Create a trip
          </button>
        </div>
      )}

      {([['ongoing', 'Happening now'], ['upcoming', 'Upcoming'], ['past', 'Past']] as [TripStatus, string][])
        .filter(([k]) => groups[k].length > 0)
        .map(([k, label]) => (
          <section key={k} className="tp-group">
            <div className="qb-section-head">
              <h2>{label}</h2>
              <span>{groups[k].length} {groups[k].length === 1 ? 'trip' : 'trips'}</span>
            </div>
            <Reveal as="div" className="qb-mosaic" variant="up" stagger>
              {(() => { const sizes = mosaicSizes(groups[k].length); return groups[k].map((t, i) => (
                <TripTile
                  key={t._id}
                  trip={t}
                  href={`/trips/${t._id}`}
                  size={sizes[i]}
                  status={k}
                  mine={{ isOwner: t.owner._id === user?.id, onDelete: () => onDelete(t._id) }}
                />
              )); })()}
            </Reveal>
          </section>
        ))}
    </div>
  );
}
