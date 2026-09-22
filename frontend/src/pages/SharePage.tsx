import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicTrip } from '../api/trips';
import type { Trip, ItineraryItem } from '../types';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { TripCover } from '../components/trips/TripTile';
import Reveal from '../components/Reveal';

function formatTime(time: string | undefined) {
  if (!time) return '';
  const hour = parseInt(time.substring(0, 2));
  if (hour < 12) return time + ' AM';
  if (hour === 12) return time + ' PM';
  return (hour - 12) + time.substring(2) + ' PM';
}

function getDayCount(trip: Trip) {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function getDayLabel(trip: Trip, day: number) {
  const date = new Date(Date.UTC(
    new Date(trip.startDate).getUTCFullYear(),
    new Date(trip.startDate).getUTCMonth(),
    new Date(trip.startDate).getUTCDate() + day - 1,
  ));
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const CATEGORY_LABELS = { food: 'Food', activity: 'Activity', attraction: 'Attraction' };

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function getOrderedDayItems(trip: Trip, day: number): ItineraryItem[] {
  const groupItemsMap = new Map<string, ItineraryItem[]>();
  for (const item of trip.items) {
    if (item.groupId) {
      const arr = groupItemsMap.get(item.groupId) ?? [];
      arr.push(item);
      groupItemsMap.set(item.groupId, arr);
    }
  }

  type Entry =
    | { position: number; kind: 'item'; item: ItineraryItem }
    | { position: number; kind: 'group'; items: ItineraryItem[] };

  const entries: Entry[] = [];

  for (const item of trip.items) {
    if (item.day === day && !item.groupId) {
      entries.push({ kind: 'item', position: item.position, item });
    }
  }
  for (const group of trip.groups ?? []) {
    if (group.day === day) {
      const items = (groupItemsMap.get(group._id) ?? []).sort((a, b) => a.position - b.position);
      entries.push({ kind: 'group', position: group.position, items });
    }
  }

  entries.sort((a, b) => a.position - b.position);

  const result: ItineraryItem[] = [];
  for (const entry of entries) {
    if (entry.kind === 'item') result.push(entry.item);
    else result.push(...entry.items);
  }
  return result;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    getPublicTrip(token)
      .then(setTrip)
      .catch(() => setError('This trip link is invalid or no longer available.'))
      .finally(() => setLoading(false));
  }, [token]);

  const days = useMemo(() => {
    if (!trip) return [];
    return Array.from({ length: getDayCount(trip) }, (_, i) => i + 1)
      .map((day) => ({ day, items: getOrderedDayItems(trip, day) }))
      .filter((d) => d.items.length > 0);
  }, [trip]);

  // Highlight the day that is currently under the sticky bar.
  useEffect(() => {
    if (days.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) setActiveDay(Number(seen.target.getAttribute('data-day')));
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    days.forEach((d) => {
      const el = document.getElementById(`day-${d.day}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [days]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  function jump(day: number) {
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <div className="qb sp"><p className="muted qb-empty">Loading trip…</p></div>;
  if (error || !trip)
    return (
      <div className="qb sp">
        <div className="qb-emptycard">
          <Icon name="compass" size={34} />
          <h3>Trip not found</h3>
          <p>{error ?? 'This link is invalid or the trip is no longer shared.'}</p>
          <Link to="/discover" className="qb-btn qb-btn--solid">Discover trips</Link>
        </div>
      </div>
    );

  const totalDays = getDayCount(trip);
  const totalCost = trip.items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const start = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const end = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const people = 1 + (trip.collaborators?.length ?? 0);

  return (
    <div className="qb sp">
      {/* Hero: the destination, big */}
      <TripCover trip={trip} className="sp-hero">
        <span className="sp-hero-dest">
          <Icon name="pin" size={16} weight="fill" /> {trip.destination}
        </span>
        <div className="sp-hero-copy">
          <h1 className="sp-title">{trip.title}</h1>
          <p className="sp-meta">
            {start} - {end}
            {trip.owner?.name && <span>Shared by {trip.owner.name}</span>}
          </p>
        </div>
      </TripCover>

      {trip.description && <p className="sp-desc">{trip.description}</p>}

      <div className="sp-bar">
        <dl className="sp-stats">
          <div><dt>Days</dt><dd>{totalDays}</dd></div>
          <div><dt>Activities</dt><dd>{trip.items.length}</dd></div>
          {people > 1 && <div><dt>Travelers</dt><dd>{people}</dd></div>}
          {totalCost > 0 && <div><dt>Estimated</dt><dd>~{money(totalCost)}</dd></div>}
        </dl>
        <div className="sp-actions">
          <button type="button" className="qb-btn qb-btn--outline" onClick={copyLink}>
            <Icon name="link" size={16} /> {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" className="qb-btn qb-btn--outline" onClick={() => window.print()}>
            <Icon name="list" size={16} /> Print or save PDF
          </button>
          <Link to={user ? '/trips' : '/register'} className="qb-btn qb-btn--solid">
            {user ? 'Plan your own' : 'Plan your own trip'} <Icon name="arrowUpRight" size={15} />
          </Link>
        </div>
      </div>

      {/* Day jumper */}
      {days.length > 1 && (
        <nav className="sp-days" aria-label="Jump to a day">
          {days.map((d) => (
            <button key={d.day} type="button" className={`sp-day-chip${activeDay === d.day ? ' is-on' : ''}`} onClick={() => jump(d.day)}>
              Day {d.day}
            </button>
          ))}
        </nav>
      )}

      {days.length === 0 && (
        <div className="qb-emptycard">
          <Icon name="list" size={34} />
          <h3>Nothing planned yet</h3>
          <p>This itinerary has no activities so far.</p>
        </div>
      )}

      {days.map(({ day, items }) => {
        const dayCost = items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
        return (
          <section key={day} id={`day-${day}`} data-day={day} className="sp-day">
            <header className="sp-day-head">
              <h2 className="sp-day-n">Day {day}</h2>
              <p className="sp-day-date">
                {getDayLabel(trip, day)}
                <span>{items.length} {items.length === 1 ? 'stop' : 'stops'}{dayCost > 0 ? `, ~${money(dayCost)}` : ''}</span>
              </p>
            </header>

            <Reveal as="ol" className="sp-items" variant="up" stagger>
              {items.map((item: ItineraryItem) => (
                <li key={item._id} className={`sp-item${item.imageUrl ? ' has-img' : ''}`}>
                  <span className="sp-time">
                    {item.startTime ? formatTime(item.startTime) : 'Anytime'}
                    {item.endTime && <em>until {formatTime(item.endTime)}</em>}
                  </span>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="sp-img"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).closest('.sp-item')?.classList.remove('has-img'); (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="sp-item-body">
                    {item.category && (
                      <span className={`rec-badge rec-badge--${item.category}`}>{CATEGORY_LABELS[item.category]}</span>
                    )}
                    <h3 className="sp-item-title">{item.title}</h3>
                    {item.location?.name && (
                      <p className="sp-item-loc">
                        <Icon name="pin" size={14} /> {item.location.name}{item.location.address ? `, ${item.location.address}` : ''}
                      </p>
                    )}
                    {item.notes && <p className="sp-item-notes">{item.notes}</p>}
                    {item.cost !== undefined && item.cost > 0 && (
                      <span className="sp-item-cost"><Icon name="dollar" size={13} /> ${item.cost.toFixed(2)}</span>
                    )}
                  </div>
                </li>
              ))}
            </Reveal>
          </section>
        );
      })}

      <section className="sp-cta">
        <h2>Like this plan?<br /><em className="punch">Make it yours.</em></h2>
        <p>Copy the ideas, add your friends and plan the trip together on Voyage. Free to start.</p>
        <Link to={user ? '/trips' : '/register'} className="qb-btn qb-btn--solid">
          {user ? 'Open my trips' : 'Start a trip'} <Icon name="arrowUpRight" size={15} />
        </Link>
      </section>
    </div>
  );
}
