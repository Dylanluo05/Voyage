import { apiFetch } from './client';
import type { AuthResponse, User } from '../types';

export function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}
