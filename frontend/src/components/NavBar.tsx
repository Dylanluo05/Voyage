import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
            <NavLink to="/sidequests" className={({ isActive }) => isActive ? 'active' : ''}>
              Sidequests
            </NavLink>
            <NavLink to="/claims" className={({ isActive }) => isActive ? 'active' : ''}>
              Claims
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
              Profile
            </NavLink>
            <NavLink to="/subscription" className={({ isActive }) => isActive ? 'active' : ''}>
              Upgrade
            </NavLink>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Log out
            </button>
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
