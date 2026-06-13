import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Voyage
      </Link>
      <div className="nav-actions">
        <Link to="/discover">Discover</Link>
        {user ? (
          <>
            <span className="muted">Hi, {user.name}</span>
            <Link to="/profile">Profile</Link>
            <Link to="/sidequests">Sidequests</Link>
            <Link to="/subscription">Upgrade</Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
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
