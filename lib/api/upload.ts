import { config } from '../config';
import { readApiKeyFromMemory } from '../auth/auth-provider';
import { ApiError, type ApiErrorCode, type MediaItem, type Visibility } from '../types';

export interface UploadMeta {
  title?: string;
  description?: string;
  visibility?: Visibility;
}

/**
 * RN/Web friendly file source.
 * - On web, `source` is a real `File` (or `Blob`).
 * - On native, the file picker returns `{ uri, name, mimeType, size }` — wrap that
 *   into the `RNFile` shape below; FormData on RN accepts it as `{ uri, name, type } as any`.
 */
export interface NativeFileSource {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export type UploadFile = File | Blob | NativeFileSource;

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadOptions {
  meta: UploadMeta;
  apiKey?: string;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}

const KNOWN_CODES: readonly ApiErrorCode[] = [
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
];

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

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MediaItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.owner_id === 'string' &&
    typeof item.original_filename === 'string' &&
    typeof item.mimetype === 'string' &&
    typeof item.file_size === 'number' &&
    typeof item.stream_url === 'string'
  );
}

function appendFile(fd: FormData, file: UploadFile) {
  if (typeof File !== 'undefined' && file instanceof File) {
    fd.append('file', file, file.name);
    return;
  }
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    fd.append('file', file as Blob);
    return;
  }
  const native = file as NativeFileSource;
  fd.append(
    'file',
    {
      uri: native.uri,
      name: native.name,
      type: native.mimeType,
    } as unknown as Blob,
  );
}

export function uploadWithProgress(
  file: UploadFile,
  { apiKey: queuedApiKey, meta, onProgress, signal }: UploadOptions,
): Promise<MediaItem> {
  return new Promise<MediaItem>((resolve, reject) => {
    const apiKey = queuedApiKey ?? readApiKeyFromMemory();
    if (!apiKey) {
      reject(
        new ApiError({
          error: 'You need to sign in to upload media.',
          code: 'UNAUTHORIZED',
          status: 401,
        }),
      );
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = `${config.API_BASE.replace(/\/$/, '')}/api/v1/media/upload`;
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable) {
        onProgress({ loaded: e.loaded, total: e.total, percent: (e.loaded / e.total) * 100 });
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiError({
          error: 'Network error during upload.',
          code: 'NETWORK_ERROR',
          status: 0,
        }),
      );
    };

    xhr.onabort = () => {
      reject(
        new ApiError({
          error: 'Upload cancelled.',
          code: 'NETWORK_ERROR',
          status: 0,
        }),
      );
    };

    xhr.onload = () => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        parsed = { error: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (isMediaItem(parsed.media)) {
          resolve(parsed.media);
          return;
        }
        reject(
          new ApiError({
            error: 'Upload response did not include a media item.',
            code: 'INTERNAL_ERROR',
            status: xhr.status,
          }),
        );
        return;
      }
      const code = (
        typeof parsed.code === 'string' && (KNOWN_CODES as readonly string[]).includes(parsed.code)
          ? parsed.code
          : 'INTERNAL_ERROR'
      ) as ApiErrorCode;
      const retryAfter = parseRetryAfter(xhr.getResponseHeader('Retry-After'));
      reject(
        new ApiError({
          error: typeof parsed.error === 'string' ? parsed.error : `HTTP ${xhr.status}`,
          code,
          status: xhr.status,
          field: typeof parsed.field === 'string' ? parsed.field : undefined,
          max_size_mb: typeof parsed.max_size_mb === 'number' ? parsed.max_size_mb : undefined,
          quota_mb: typeof parsed.quota_mb === 'number' ? parsed.quota_mb : undefined,
          detected_mimetype:
            typeof parsed.detected_mimetype === 'string' ? parsed.detected_mimetype : undefined,
          retry_after_seconds: retryAfter,
        }),
      );
    };

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    const fd = new FormData();
    appendFile(fd, file);
    if (meta.title) fd.append('title', meta.title);
    if (meta.description) fd.append('description', meta.description);
    fd.append('visibility', meta.visibility ?? 'private');

    xhr.send(fd);
  });
}
