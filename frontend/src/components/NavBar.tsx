import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Voyage
      </Link>
      <div className="nav-actions">
        {user ? (
          <>
            <span className="muted">Hi, {user.name}</span>
            <Link to="/profile">Profile</Link>
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
      </div>
    </nav>
  );
}
