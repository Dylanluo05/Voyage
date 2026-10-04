import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import type { OtpPurpose } from '../types';

const RESEND_COOLDOWN_S = 30;

interface Props {
  email: string;
  purpose: OtpPurpose;
  onVerified: () => void;
}

export default function OtpStep({ email, purpose, onVerified }: Props) {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(email, code, purpose);
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    setError(null);
    setResending(true);
    try {
      await resendOtp(email, purpose);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <p className="muted small">We emailed a 6-digit code to {email}.</p>
      <label>
        Code
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          autoComplete="one-time-code"
        />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={submitting || code.length !== 6}>
        {submitting ? 'Verifying…' : 'Verify'}
      </button>
      <button type="button" className="ghost" onClick={onResend} disabled={resending || cooldown > 0}>
        {cooldown > 0 ? `Resend code (${cooldown}s)` : resending ? 'Resending…' : 'Resend code'}
      </button>
    </form>
  );
}
