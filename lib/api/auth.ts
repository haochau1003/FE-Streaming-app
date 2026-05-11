import { client } from './client';

export interface AuthUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_media_id: string | null;
  created_at: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  api_key: string;
}

export function login(login: string, password: string): Promise<AuthResponse> {
  return client<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { login, password },
  });
}

export function register(
  username: string,
  email: string,
  password: string,
  display_name?: string,
): Promise<AuthResponse> {
  return client<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { username, email, password, display_name },
  });
}

export function logout(): Promise<void> {
  return client<void>('/api/v1/auth/logout', {
    method: 'POST',
    authRequired: true,
  });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return client<{ user: AuthUser }>('/api/v1/auth/me', { authRequired: true });
}
