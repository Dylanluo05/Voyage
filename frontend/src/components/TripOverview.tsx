import { Icon } from './Icon';
import type { Trip, ItineraryItem } from '../types';
import type { SectionKey } from './TripWorkspace';
import { useAuth } from '../context/AuthContext';
import { getMyBudget, getMySpending } from '../utils/budget';

/* Trip dashboard: where the trip stands, what is next, and what is still missing. */

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function localToday(): number {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmtTime(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

type Props = {
  trip: Trip;
  totalDays: number;
  onGo: (key: SectionKey) => void;
};

export default function TripOverview({ trip, totalDays, onGo }: Props) {
  const { user } = useAuth();
  const myBudget = getMyBudget(trip, user?.id);
  const start = utcDay(trip.startDate);
  const end = utcDay(trip.endDate);
  const today = localToday();

  const untilStart = Math.round((start - today) / DAY_MS);
  const phase: 'before' | 'during' | 'after' = today < start ? 'before' : today > end ? 'after' : 'during';
  const dayNow = phase === 'during' ? Math.round((today - start) / DAY_MS) + 1 : 1;

  const heroLine =
    phase === 'before'
      ? { pre: untilStart === 1 ? 'Starts' : 'Starts in', big: untilStart === 1 ? 'tomorrow' : String(untilStart), post: untilStart === 1 ? '' : 'days' }
      : phase === 'during'
        ? { pre: 'Day', big: String(dayNow), post: `of ${totalDays}` }
        : { pre: trip.isCompleted ? 'Trip' : 'Ended', big: trip.isCompleted ? 'complete' : String(Math.round((today - end) / DAY_MS)), post: trip.isCompleted ? '' : 'days ago' };

  const spent = getMySpending(trip, user?.id).total;
  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const travelers = 1 + (trip.collaborators?.length ?? 0);

  const nextDay = Math.min(dayNow, totalDays);
  const nextItems: ItineraryItem[] = trip.items
    .filter((i) => i.day === nextDay)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .slice(0, 5);

  const checklist: { label: string; done: boolean; go: SectionKey; cta: string }[] = [
    { label: 'Plan at least one stop', done: trip.items.length > 0, go: 'itinerary', cta: 'Add a stop' },
    { label: 'Book flights', done: trip.flights.length > 0, go: 'flights', cta: 'Add flight' },
    { label: 'Book a place to stay', done: trip.hotels.length > 0, go: 'hotels', cta: 'Add hotel' },
    { label: 'Set your budget', done: !!myBudget, go: 'budget', cta: 'Set budget' },
    { label: 'Invite your crew', done: (trip.collaborators?.length ?? 0) > 0, go: 'collaborators', cta: 'Invite' },
    { label: 'Build the playlist', done: trip.playlist.length > 0, go: 'trip-playlist', cta: 'Add songs' },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="ov">
      <section className="ov-hero">
        <p className="ov-hero-place">{trip.destination}</p>
        <h2 className="ov-hero-line">
          {heroLine.pre} <em className="punch">{heroLine.big}</em> {heroLine.post}
        </h2>
        <p className="ov-hero-dates">
          {fmtDate(trip.startDate)} - {fmtDate(trip.endDate)} · {totalDays} day{totalDays === 1 ? '' : 's'}
        </p>
        <div className="ov-hero-actions">
          <button type="button" className="ov-btn ov-btn--solid" onClick={() => onGo('itinerary')}>
            Open itinerary
            <Icon name="arrowUpRight" size={15} />
          </button>
          <button type="button" className="ov-btn ov-btn--ghost" onClick={() => onGo('chat')}>
            <Icon name="ai" size={15} />
            Ask the assistant
          </button>
        </div>
      </section>

      <section className="ov-stats" aria-label="Trip at a glance">
        <div>
          <span className="ov-stat-n">{totalDays}</span>
          <span className="ov-stat-l">{totalDays === 1 ? 'day' : 'days'}</span>
        </div>
        <div>
          <span className="ov-stat-n">{trip.items.length}</span>
          <span className="ov-stat-l">{trip.items.length === 1 ? 'stop' : 'stops'}</span>
        </div>
        <div>
          <span className="ov-stat-n">{travelers}</span>
          <span className="ov-stat-l">{travelers === 1 ? 'traveler' : 'travelers'}</span>
        </div>
        <div>
          <span className="ov-stat-n">{money(spent)}</span>
          <span className="ov-stat-l">{myBudget ? `your share of ${money(myBudget)}` : 'your share, no budget set'}</span>
        </div>
      </section>

      <section className="ov-card ov-next">
        <div className="ov-card-head">
          <h3>{phase === 'during' ? `Today, day ${nextDay}` : `Day ${nextDay}`}</h3>
          <button type="button" className="ov-link" onClick={() => onGo('itinerary')}>
            Full itinerary <Icon name="arrowRight" size={14} />
          </button>
        </div>
        {nextItems.length === 0 ? (
          <div className="ov-empty">
            <p>Nothing planned for day {nextDay} yet.</p>
            <button type="button" className="ov-btn ov-btn--outline" onClick={() => onGo('itinerary')}>
              <Icon name="plus" size={14} /> Add a stop
            </button>
          </div>
        ) : (
          <ol className="ov-timeline">
            {nextItems.map((it) => (
              <li key={it._id}>
                <span className="ov-time">{fmtTime(it.startTime) || 'Any time'}</span>
                <span className="ov-what">
                  <strong>{it.title}</strong>
                  {it.location?.name && <em>{it.location.name}</em>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="ov-card ov-ready">
        <div className="ov-card-head">
          <h3>Trip readiness</h3>
          <span className="ov-count">
            {doneCount} of {checklist.length}
          </span>
        </div>
        <div className="ov-bar" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={doneCount}>
          <span style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
        </div>
        <ul className="ov-checks">
          {checklist.map((c) => (
            <li key={c.label} className={c.done ? 'is-done' : ''}>
              <span className="ov-check-ico">
                <Icon name={c.done ? 'checkCircle' : 'plus'} size={18} weight={c.done ? 'fill' : 'regular'} />
              </span>
              <span className="ov-check-label">{c.label}</span>
              {!c.done && (
                <button type="button" className="ov-link" onClick={() => onGo(c.go)}>
                  {c.cta}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
