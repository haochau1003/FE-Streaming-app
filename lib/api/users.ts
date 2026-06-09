import { config } from '../config';
import { readApiKeyFromMemory } from '../auth/auth-provider';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = readApiKeyFromMemory();
  const res = await fetch(`${config.API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function fetchMe(): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>('/api/v1/auth/me');
  return resolveAvatarUrl(data.user);
}

export async function fetchUser(userId: string): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>(`/api/v1/users/${userId}`);
  return resolveAvatarUrl(data.user);
}

export async function updateMe(patch: {
  display_name?: string | null;
  avatar_media_id?: string | null;
  current_password?: string;
  new_password?: string;
}): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>('/api/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return resolveAvatarUrl(data.user);
}

function resolveAvatarUrl(user: UserProfile): UserProfile {
  if (user.avatar_url && !user.avatar_url.startsWith('http')) {
    return { ...user, avatar_url: `${config.API_BASE}${user.avatar_url}` };
  }
  return user;
}
