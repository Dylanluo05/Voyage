import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HIDDEN_PREFIXES = ['/share/', '/upload/'];

export default function Footer() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="brand">Voyage</Link>
          <p>Itineraries, friends and sidequests in one place.</p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <Link to="/discover">Discover</Link>
          {user ? <Link to="/trips">Trips</Link> : <Link to="/register">Get started</Link>}
          <Link to="/sidequests">Sidequests</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/how-to-play">How to play</Link>
        </nav>

        <div className="site-footer-meta">
          <span>&copy; {year} Voyage</span>
          <Link to="/subscription">Plans</Link>
        </div>
      </div>
    </footer>
  );
}
