import { apiFetch } from './client';
import type { AuthResponse, PendingAuth, OtpPurpose, User } from '../types';

export function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse | PendingAuth> {
  return apiFetch<AuthResponse | PendingAuth>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function googleAuth(accessToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`/api/auth/google`, {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse | PendingAuth> {
  return apiFetch<AuthResponse | PendingAuth>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code, purpose }),
  });
}

export function resendOtp(email: string, purpose: OtpPurpose): Promise<PendingAuth> {
  return apiFetch<PendingAuth>('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });
}

export function fetchMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
