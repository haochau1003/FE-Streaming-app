import { config } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== Types matching Flask response shapes =====

export type StreamStatus = 'idle' | 'active' | 'disconnected' | 'ended';

export interface Stream {
  id: string;
  title: string;
  description: string;
  privacy: 'public' | 'private' | 'unlisted';
  status: StreamStatus;
  playback_url: string | null;
  like_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface BroadcastCredentials {
  rtmp_url: string;
  stream_key: string;
}

export interface CreatedStream extends Stream {
  broadcast: BroadcastCredentials;
}

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_media_id: string | null;
  bio: string | null;
  dob: string | null;
  stream_key: string | null;
  api_key?: string;
  created_at: string;
  updated_at: string;
}

// ===== Errors =====

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ===== HTTP helper =====

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`;
  const apiKey = await AsyncStorage.getItem('api_key');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body as { error?: string })?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

// ===== Public API =====

export async function listStreams(): Promise<{ streams: Stream[]; count: number }> {
  return request('/api/v1/streams');
}

export async function getStream(streamId: string): Promise<{ stream: Stream }> {
  return request(`/api/v1/streams/${streamId}`);
}

export async function createStream(input: {
  title?: string;
  description?: string;
  privacy?: 'public' | 'private' | 'unlisted';
}): Promise<{ stream: CreatedStream }> {
  return request('/api/v1/streams', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function endStream(
  streamId: string,
): Promise<{ stream: Stream; message: string }> {
  return request(`/api/v1/streams/${streamId}/end`, { method: 'POST' });
}

export async function likeStream(streamId: string): Promise<{ like_count: number }> {
  return request(`/api/v1/streams/${streamId}/like`, { method: 'POST' });
}

// ===== Auth API =====

export async function loginUser(input: any): Promise<User> {
  return request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export async function registerUser(input: any): Promise<User> {
  return request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export async function logoutUser(): Promise<{message: string}> {
  return request('/api/v1/auth/logout', { method: 'POST' });
}

export async function getProfile(): Promise<User> {
  return request('/api/v1/auth/profile');
}

export async function updateProfile(input: any): Promise<User> {
  return request('/api/v1/auth/profile', { method: 'PUT', body: JSON.stringify(input) });
}