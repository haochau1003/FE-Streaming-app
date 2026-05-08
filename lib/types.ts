/**
 * Shared types for the Content Library feature.
 *
 * Naming rule (architecture §4.2): backend snake_case is preserved verbatim in
 * API-facing types. Auto-conversion is forbidden.
 */

export type Visibility = 'public' | 'private' | 'unlisted';

export interface MediaItem {
  id: string;
  owner_id: string;
  original_filename: string;
  mimetype: string;
  file_size: number;
  title: string;
  description: string;
  visibility: Visibility;
  storage_bucket: string;
  storage_key: string;
  width: number | null;
  height: number | null;
  thumbnail_key: string | null;
  stream_url: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MediaListResponse {
  items: MediaItem[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PresignedUrlResponse {
  url: string;
  expires_at: string;
  expires_in_seconds: number;
}

export interface ListMediaParams {
  page?: number;
  per_page?: number;
  owner_id?: string;
  visibility?: Visibility;
  mimetype_prefix?: string;
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_FIELD'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'QUOTA_EXCEEDED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INVALID_RANGE'
  | 'RATE_LIMITED'
  | 'STORAGE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  field?: string;
  max_size_mb?: number;
  quota_mb?: number;
  detected_mimetype?: string | null;
  range?: string | null;
  retry_after_seconds?: number;

  constructor(payload: {
    error: string;
    code: ApiErrorCode;
    status: number;
    field?: string;
    max_size_mb?: number;
    quota_mb?: number;
    detected_mimetype?: string | null;
    range?: string | null;
    retry_after_seconds?: number;
  }) {
    super(payload.error);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.field = payload.field;
    this.max_size_mb = payload.max_size_mb;
    this.quota_mb = payload.quota_mb;
    this.detected_mimetype = payload.detected_mimetype;
    this.range = payload.range;
    this.retry_after_seconds = payload.retry_after_seconds;
  }
}

export type ToastLevel = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  level: ToastLevel;
  title: string;
  message?: string;
  recoveryHint?: string;
  durationMs?: number;
}
