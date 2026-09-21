import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* ─────────────────────────────────────────────────────────────────────────
 * Trip workspace navigation (replaces the old one-long-page + anchor bar).
 *
 *   [ Overview | Plan | Book | Money | People ]      <- segmented control (groups)
 *   ┌────────────┬────────────────────────────────┐
 *   │ ▣ Itinerary│                                │
 *   │   Map      │      the selected section      │  <- rail (sections of the group)
 *   │   Weather  │                                │
 *   └────────────┴────────────────────────────────┘
 *
 * Panes stay mounted once visited (so chat history and half-filled forms
 * survive switching tabs); the map opts out because Google Maps mis-sizes when
 * it is re-shown from display:none.
 * ───────────────────────────────────────────────────────────────────────── */

export type SectionKey =
  | 'overview'
  | 'itinerary'
  | 'map'
  | 'weather'
  | 'chat'
  | 'flights'
  | 'hotels'
  | 'budget'
  | 'expenses'
  | 'collaborators'
  | 'sidequests'
  | 'trip-playlist'
  | 'log';

type SectionMeta = { label: string; icon: IconName; blurb: string };

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  overview: { label: 'Overview', icon: 'suitcase', blurb: 'Where the trip stands' },
  itinerary: { label: 'Itinerary', icon: 'list', blurb: 'Day by day' },
  map: { label: 'Map', icon: 'map', blurb: 'Every stop on one map' },
  weather: { label: 'Weather', icon: 'weather', blurb: 'Forecast for your dates' },
  chat: { label: 'Assistant', icon: 'ai', blurb: 'Plan with AI' },
  flights: { label: 'Flights', icon: 'plane', blurb: 'Getting there' },
  hotels: { label: 'Hotels', icon: 'bed', blurb: 'Where you stay' },
  budget: { label: 'Budget', icon: 'coins', blurb: 'What you plan to spend' },
  expenses: { label: 'Expenses', icon: 'expense', blurb: 'Split costs, settle up' },
  collaborators: { label: 'Travelers', icon: 'collab', blurb: 'Who is coming' },
  sidequests: { label: 'Sidequests', icon: 'compass', blurb: 'Challenges for this trip' },
  'trip-playlist': { label: 'Playlist', icon: 'music', blurb: 'The trip soundtrack' },
  log: { label: 'Trip log', icon: 'camera', blurb: 'Photos and memories' },
};

type Group = { key: string; label: string; sections: SectionKey[] };

export const GROUPS: Group[] = [
  { key: 'overview', label: 'Overview', sections: ['overview'] },
  { key: 'plan', label: 'Plan', sections: ['itinerary', 'map', 'weather', 'chat'] },
  { key: 'book', label: 'Book', sections: ['flights', 'hotels'] },
  { key: 'money', label: 'Money', sections: ['budget', 'expenses'] },
  { key: 'people', label: 'People', sections: ['collaborators', 'sidequests', 'trip-playlist', 'log'] },
];

/** Sections a traveler can hide per trip (Overview is always there; Log only exists once completed). */
export const ALL_SECTIONS = (Object.keys(SECTION_META) as SectionKey[])
  .filter((k) => k !== 'overview' && k !== 'log')
  .map((key) => ({ key, label: SECTION_META[key].label }));

export const isSectionKey = (k: string): k is SectionKey => k in SECTION_META;

type Props = {
  active: SectionKey;
  onChange: (key: SectionKey) => void;
  visibleSections: Set<string>;
  onToggleSection: (key: string) => void;
  /** Live one-liners shown on the right of each rail item, e.g. "4 items". */
  meta: Partial<Record<SectionKey, string>>;
  logAvailable: boolean;
  children: ReactNode;
};

export default function TripWorkspace({
  active,
  onChange,
  visibleSections,
  onToggleSection,
  meta,
  logAvailable,
  children,
}: Props) {
  const [showCustomize, setShowCustomize] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCustomize) return;
    const onDown = (e: MouseEvent) => {
      if (!customizeRef.current?.contains(e.target as Node)) setShowCustomize(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showCustomize]);

  const isVisible = (k: SectionKey) =>
    k === 'overview' || (k === 'log' ? logAvailable : visibleSections.has(k));

  const groups = GROUPS.map((g) => ({ ...g, sections: g.sections.filter(isVisible) })).filter(
    (g) => g.sections.length > 0,
  );
  const activeGroup = groups.find((g) => g.sections.includes(active)) ?? groups[0];
  const showRail = activeGroup.key !== 'overview';

  return (
    <div className="tw">
      <div className="tw-seg" role="tablist" aria-label="Trip areas">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={g.key === activeGroup.key}
            className="tw-seg-btn"
            onClick={() => onChange(g.sections[0])}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className={`tw-grid${showRail ? '' : ' tw-grid--full'}`}>
        {showRail && (
          <nav className="tw-rail" aria-label={`${activeGroup.label} sections`}>
            <p className="tw-rail-title">{activeGroup.label}</p>
            {activeGroup.sections.map((k) => {
              const m = SECTION_META[k];
              const on = k === active;
              return (
                <button
                  key={k}
                  type="button"
                  className={`tw-rail-btn${on ? ' is-on' : ''}`}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => onChange(k)}
                >
                  <span className="tw-rail-ico">
                    <Icon name={m.icon} size={18} weight={on ? 'fill' : 'regular'} />
                  </span>
                  <span className="tw-rail-label">{m.label}</span>
                  {meta[k] && <span className="tw-rail-meta">{meta[k]}</span>}
                </button>
              );
            })}

            <div className="tw-customize" ref={customizeRef}>
              <button type="button" className="tw-customize-btn" onClick={() => setShowCustomize((v) => !v)}>
                <Icon name="gear" size={15} /> Customize sections
              </button>
              {showCustomize && (
                <div className="tw-customize-menu">
                  {ALL_SECTIONS.map((s) => (
                    <label key={s.key} className="tw-customize-row">
                      <input
                        type="checkbox"
                        checked={visibleSections.has(s.key)}
                        onChange={() => onToggleSection(s.key)}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </nav>
        )}

        <div className="tw-panes">{children}</div>
      </div>
    </div>
  );
}

type PaneProps = {
  k: SectionKey;
  active: SectionKey;
  visited: Set<string>;
  /** false = unmount while hidden (used for the map). */
  keepAlive?: boolean;
  children: ReactNode;
};

/** Mounts on first visit, then just toggles `hidden` so local state survives tab switches. */
export function TripPane({ k, active, visited, keepAlive = true, children }: PaneProps) {
  const on = active === k;
  if (!visited.has(k) || (!keepAlive && !on)) return null;
  return (
    <div className="tw-pane" id={`${k}-pane`} hidden={!on}>
      {children}
    </div>
  );
}
