import { config } from './config';
import { readApiKeyFromMemory } from './auth';

// ===== Types matching Flask response shapes =====

export type StreamStatus = 'idle' | 'connected' | 'active' | 'disconnected' | 'ended';

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
  const url = `${config.API_BASE}${path}`;
  const apiKey = readApiKeyFromMemory();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...options.headers,
    },
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