import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sqOpen, setSqOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const sqRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSqOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sqRef.current && !sqRef.current.contains(e.target as Node)) setSqOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sqActive = ['/sidequests', '/claims', '/leaderboard', '/how-to-play'].includes(location.pathname);
  const userActive = ['/profile', '/subscription'].includes(location.pathname);

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Voyage</Link>
      <div className="nav-actions">
        <NavLink to="/discover" className={({ isActive }) => isActive ? 'active' : ''}>
          Discover
        </NavLink>

        {user ? (
          <>
            <NavLink to="/trips" className={({ isActive }) => isActive ? 'active' : ''}>
              Trips
            </NavLink>

            <div className="nav-dropdown" ref={sqRef}>
              <button
                type="button"
                className={`nav-dropdown-trigger${sqActive || sqOpen ? ' active' : ''}`}
                onClick={() => { setSqOpen(o => !o); setUserOpen(false); }}
              >
                Sidequests <span className={`nav-dropdown-caret${sqOpen ? ' open' : ''}`}>▾</span>
              </button>
              {sqOpen && (
                <div className="nav-dropdown-menu">
                  <NavLink to="/sidequests" className={({ isActive }) => isActive ? 'active' : ''}>Browse</NavLink>
                  <NavLink to="/claims" className={({ isActive }) => isActive ? 'active' : ''}>My Claims</NavLink>
                  <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink>
                  <NavLink to="/how-to-play" className={({ isActive }) => isActive ? 'active' : ''}>How to Play</NavLink>
                </div>
              )}
            </div>

            <div className="nav-dropdown" ref={userRef}>
              <button
                type="button"
                className={`nav-dropdown-trigger${userActive || userOpen ? ' active' : ''}`}
                onClick={() => { setUserOpen(o => !o); setSqOpen(false); }}
              >
                {user.name} <span className={`nav-dropdown-caret${userOpen ? ' open' : ''}`}>▾</span>
              </button>
              {userOpen && (
                <div className="nav-dropdown-menu nav-dropdown-menu--right">
                  <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
                  <NavLink to="/subscription" className={({ isActive }) => isActive ? 'active' : ''}>Upgrade ✦</NavLink>
                  <div className="nav-dropdown-divider" />
                  <button
                    type="button"
                    className="nav-dropdown-logout"
                    onClick={() => { logout(); navigate('/login'); }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}>
              Log in
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>
              Sign up
            </NavLink>
          </>
        )}

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
}
