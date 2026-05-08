import { config } from '../config';
import { ApiError, type ApiErrorCode } from '../types';
import { readApiKeyFromMemory } from '../auth/auth-provider';

interface ClientOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  authRequired?: boolean;
}

const KNOWN_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  'INVALID_REQUEST',
  'INVALID_FIELD',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'FILE_TOO_LARGE',
  'QUOTA_EXCEEDED',
  'UNSUPPORTED_MEDIA_TYPE',
  'INVALID_RANGE',
  'RATE_LIMITED',
  'STORAGE_UNAVAILABLE',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
]);

function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 413:
      return 'FILE_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 416:
      return 'INVALID_RANGE';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'STORAGE_UNAVAILABLE';
    default:
      return 'INTERNAL_ERROR';
  }
}

function buildAbsoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = config.API_BASE.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.ceil(numeric);
  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) {
    return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  }
  return undefined;
}

export function authHeaders(): Record<string, string> | undefined {
  const apiKey = readApiKeyFromMemory();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
}

export async function client<T>(path: string, options: ClientOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal, authRequired = false } = options;

  const apiKey = readApiKeyFromMemory();
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (apiKey) finalHeaders.Authorization = `Bearer ${apiKey}`;
  if (authRequired && !apiKey) {
    throw new ApiError({
      error: 'You need to sign in to do that.',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      payload = JSON.stringify(body);
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  let res: Response;
  try {
    res = await fetch(buildAbsoluteUrl(path), {
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError({
      error: e instanceof Error ? e.message : 'Network error',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  if (res.status === 204) return undefined as T;

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text };
    }
  }

  if (!res.ok) {
    const envelope = (parsed ?? {}) as Record<string, unknown>;
    const rawCode = typeof envelope.code === 'string' ? (envelope.code as ApiErrorCode) : null;
    const code: ApiErrorCode =
      rawCode && KNOWN_CODES.has(rawCode) ? rawCode : statusToCode(res.status);
    const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
    throw new ApiError({
      error: typeof envelope.error === 'string' ? envelope.error : `HTTP ${res.status}`,
      code,
      status: res.status,
      field: typeof envelope.field === 'string' ? envelope.field : undefined,
      max_size_mb: typeof envelope.max_size_mb === 'number' ? envelope.max_size_mb : undefined,
      quota_mb: typeof envelope.quota_mb === 'number' ? envelope.quota_mb : undefined,
      detected_mimetype:
        typeof envelope.detected_mimetype === 'string' ? envelope.detected_mimetype : undefined,
      range: typeof envelope.range === 'string' ? envelope.range : undefined,
      retry_after_seconds: retryAfter,
    });
  }

  return (parsed as T) ?? (undefined as T);
}

export function streamUrl(item: { stream_url: string }): string {
  return buildAbsoluteUrl(item.stream_url);
}

export function streamSource(item: { stream_url: string; visibility?: string }) {
  const uri = streamUrl(item);
  const headers = item.visibility === 'private' ? authHeaders() : undefined;
  return headers ? { uri, headers } : uri;
}
