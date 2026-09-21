import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Trip } from '../../types';
import { Icon } from '../Icon';
import { useTripCover } from './useTripCover';

export type TripStatus = 'upcoming' | 'ongoing' | 'past';
export type TileSize = 'lg' | 'md' | 'sm' | 'half';

/** Rows of 7+5, 5+7, 4+4+4 repeating. An unfinished last row is widened so it never leaves a hole:
 *  two leftover tiles become 6+6, a single one takes the wide 7-column slot. */
export function mosaicSizes(n: number): TileSize[] {
  const rows: TileSize[][] = [['lg', 'md'], ['md', 'lg'], ['sm', 'sm', 'sm']];
  const out: TileSize[] = [];
  for (let r = 0; out.length < n; r++) {
    const row = rows[r % rows.length];
    const left = n - out.length;
    if (left >= row.length) out.push(...row);
    else out.push(...(left === 2 ? (['half', 'half'] as TileSize[]) : (['lg'] as TileSize[])));
  }
  return out;
}

const PALETTES = [
  ['#0b2a4a', '#0b5cad'],
  ['#12251f', '#1f5c47'],
  ['#26201a', '#7a5a3a'],
  ['#1d2233', '#4a5a8c'],
  ['#2a1a2e', '#6b3a72'],
  ['#1a1f1c', '#3b4a3f'],
];

function palette(dest: string): [string, string] {
  let h = 0;
  for (let i = 0; i < dest.length; i++) h = (h * 31 + dest.charCodeAt(i)) & 0xffffffff;
  const p = PALETTES[Math.abs(h) % PALETTES.length];
  return [p[0], p[1]];
}

export function tripDays(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
}

export function tripStatus(start: string, end: string): TripStatus {
  const now = Date.now();
  if (now < new Date(start).getTime()) return 'upcoming';
  if (now > new Date(end).getTime() + 86_399_000) return 'past';
  return 'ongoing';
}

const fmt = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Cover image with generated fallback art. Reused by tiles and the "next up" card. */
export function TripCover({ trip, className = '', children }: { trip: Trip; className?: string; children?: React.ReactNode }) {
  const url = useTripCover(trip);
  const [c1, c2] = palette(trip.destination);
  const style = { '--sc': c2, '--sc2': c1 } as CSSProperties;
  return (
    <div className={`qc tt-cover ${className}`} style={style}>
      {url ? (
        <img className="qc-img" src={url} alt="" loading="lazy" draggable={false} />
      ) : (
        <div className="qc-art" aria-hidden="true">
          <span className="tt-art-letter">{trip.destination.trim().slice(0, 1).toUpperCase()}</span>
        </div>
      )}
      <div className="qc-shade" aria-hidden="true" />
      {children}
    </div>
  );
}

type Props = {
  trip: Trip;
  href: string;
  size: TileSize;
  status?: TripStatus;
  /** Private list: show "Shared" for trips you do not own and a Delete action for ones you do. */
  mine?: { isOwner: boolean; onDelete: () => void };
  /** Public feed: show the author. */
  showAuthor?: boolean;
};

const STATUS_LABEL: Record<TripStatus, string> = { upcoming: 'Upcoming', ongoing: 'Happening now', past: 'Past' };

export default function TripTile({ trip, href, size, status, mine, showAuthor }: Props) {
  const days = tripDays(trip.startDate, trip.endDate);
  const people = 1 + (trip.collaborators?.length ?? 0);

  return (
    <article className={`qt qt--${size} tt${status === 'past' ? ' is-past' : ''}`}>
      <Link to={href} className="qt-cover-btn" aria-label={`Open trip: ${trip.title}`}>
        <TripCover trip={trip}>
          {status && (
            <span className={`tt-status tt-status--${status}`}>
              {status === 'ongoing' && <i className="tt-live" />}
              {STATUS_LABEL[status]}
            </span>
          )}
          <span className="qt-xp tt-days">{days} {days === 1 ? 'day' : 'days'}</span>
          <span className="tt-dest">
            <Icon name="pin" size={16} weight="fill" /> {trip.destination}
          </span>
          <span className="qt-view">
            Open <Icon name="arrowUpRight" size={14} />
          </span>
        </TripCover>
      </Link>

      <div className="qt-body">
        <div>
          <h3 className="qt-title">
            <Link to={href}>{trip.title}</Link>
          </h3>
          {trip.description && <p className="tt-desc">{trip.description}</p>}
          <p className="qt-meta">
            <span>
              <Icon name="calendar" size={13} /> {fmt(trip.startDate)} - {fmt(trip.endDate)}
            </span>
            <span>
              <Icon name="list" size={13} /> {trip.items.length} {trip.items.length === 1 ? 'stop' : 'stops'}
            </span>
            {people > 1 && (
              <span>
                <Icon name="collab" size={13} /> {people} people
              </span>
            )}
            {mine && !mine.isOwner && <span className="tt-shared">Shared with you</span>}
            {showAuthor && trip.owner?.name && <span>By {trip.owner.name}</span>}
          </p>
        </div>

        <div className="qt-foot">
          <Link to={href} className="qt-btn tt-open">
            {mine ? 'Open trip' : 'View itinerary'} <Icon name="arrowUpRight" size={15} />
          </Link>
          {mine?.isOwner && (
            <button type="button" className="tt-delete" onClick={mine.onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
