import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import AuthShell from '../components/AuthShell';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title={<>Check your <em className="punch">email.</em></>} lede="If that email has an account, a reset link is on its way.">
        <p className="au-switch">
          Remembered your password? <Link to="/login">Log in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={<>Reset your <em className="punch">password.</em></>} lede="Enter your email and we'll send you a reset link.">
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="au-switch">
        Remembered your password? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
