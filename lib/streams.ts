import { config } from './config';

// ===== Types matching Flask response shapes =====

export type StreamStatus = 'idle' | 'connected' | 'active' | 'disconnected' | 'ended';

export interface Stream {
  id: string;
  title: string;
  description: string;
  privacy: 'public' | 'private' | 'unlisted';
  status: StreamStatus;
  // LiveKit WebSocket URL the viewer should connect to.
  livekit_url: string;
  // LiveKit room name (equal to stream.id; convenience field).
  room_name: string;
  like_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * Response from `POST /api/v1/streams`. The publisher_token is sensitive —
 * the laptop broadcaster receives it once on stream creation and never
 * exposes it again. Viewers should NEVER see this; they use `fetchViewerToken`.
 */
export interface CreatedStreamResponse {
  stream: Stream;
  publisher_token: string;
  livekit_url: string;
}

export interface ViewerTokenResponse {
  viewer_token: string;
  livekit_url: string;
  room_name: string;
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
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
}): Promise<CreatedStreamResponse> {
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

/**
 * Mint a subscriber-only LiveKit token for a viewer of a specific stream.
 * Optional identity / display_name body — backend derives one from
 * request.remote_addr when omitted. See app/api/stream_routes.py.
 */
export async function fetchViewerToken(
  streamId: string,
  input: { identity?: string; display_name?: string } = {},
): Promise<ViewerTokenResponse> {
  return request(`/api/v1/streams/${streamId}/viewer-token`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
