import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, type IconName } from './Icon';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  /** Extra path prefixes that should light this tab up. */
  also?: string[];
}

const TABS: Tab[] = [
  { to: '/trips', label: 'Trips', icon: 'suitcase' },
  { to: '/sidequests', label: 'Quests', icon: 'cards', also: ['/claims', '/how-to-play'] },
  { to: '/discover', label: 'Discover', icon: 'compass' },
  { to: '/leaderboard', label: 'Ranks', icon: 'trophy' },
  { to: '/profile', label: 'Profile', icon: 'user', also: ['/subscription'] },
];

/** Routes where a bottom tab bar would be noise (auth flow, landing, public share pages). */
const HIDDEN_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/share', '/upload'];

/**
 * App-style bottom navigation for signed-in users on phones. CSS shows it only at
 * ≤768px (web or native); the top navbar's hamburger remains for secondary links.
 */
export default function TabBar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const hidden = pathname === '/' || HIDDEN_PREFIXES.some(p => pathname.startsWith(p));
  if (!user || hidden) return null;

  return (
    <nav className="tab-bar" aria-label="Primary">
      {TABS.map(tab => {
        const active =
          pathname.startsWith(tab.to) || (tab.also ?? []).some(p => pathname.startsWith(p));
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`tab-bar-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={24} weight={active ? 'fill' : 'regular'} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
