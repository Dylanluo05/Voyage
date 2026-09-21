import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sqOpen, setSqOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sqRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSqOpen(false);
    setUserOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-menu-open', mobileOpen);
    return () => document.body.classList.remove('nav-menu-open');
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sqRef.current && !sqRef.current.contains(e.target as Node)) setSqOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sqActive = ['/sidequests', '/leaderboard', '/how-to-play'].includes(location.pathname);
  const userActive = ['/profile', '/subscription'].includes(location.pathname);

  let mobileIndex = 0;
  const stagger = (): CSSProperties => ({ '--stagger': mobileIndex++ } as CSSProperties);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="brand">
          <Icon name="compass" size={20} weight="fill" />
          Voyage
        </Link>

        {/* Desktop nav */}
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
                    <NavLink to="/subscription" className={({ isActive }) => isActive ? 'active' : ''}>Upgrade</NavLink>
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
              <NavLink to="/register" className="nav-cta">
                Sign up
              </NavLink>
            </>
          )}

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          className={`nav-hamburger${mobileOpen ? ' open' : ''}`}
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {mobileOpen && createPortal(
        <div className="nav-mobile-drawer">
          <NavLink to="/discover" style={stagger()}>Discover</NavLink>
          {user ? (
            <>
              <NavLink to="/trips" style={stagger()}>Trips</NavLink>
              <div className="nav-mobile-section-label" style={stagger()}>Sidequests</div>
              <NavLink to="/sidequests" style={stagger()}>Sidequests</NavLink>
              <NavLink to="/leaderboard" style={stagger()}>Leaderboard</NavLink>
              <NavLink to="/how-to-play" style={stagger()}>How to Play</NavLink>
              <div className="nav-mobile-divider" style={stagger()} />
              <NavLink to="/profile" style={stagger()}>Profile</NavLink>
              <NavLink to="/subscription" style={stagger()}>Upgrade</NavLink>
              <div className="nav-mobile-divider" style={stagger()} />
              <button
                type="button"
                className="nav-mobile-logout"
                style={stagger()}
                onClick={() => { logout(); navigate('/login'); }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" style={stagger()}>Log in</NavLink>
              <NavLink to="/register" style={stagger()}>Sign up</NavLink>
            </>
          )}
          <div className="nav-mobile-divider" style={stagger()} />
          <button type="button" className="nav-mobile-theme" style={stagger()} onClick={toggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
