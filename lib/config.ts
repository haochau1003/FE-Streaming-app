
import Constants from 'expo-constants';

interface RuntimeConfig {
  API_BASE: string;
  SOCKET_URL: string;
  MEDIA_MAX_SIZE_MB: number;
  MEDIA_QUOTA_MB_PER_USER: number;
  MEDIA_ALLOWED_MIMETYPES: string[];
  MEDIA_PRESIGNED_TTL_SECONDS: number;
  MEDIA_UPLOAD_LIMIT_PER_MINUTE: number;
}

const defaults: RuntimeConfig = {
  API_BASE: 'http://localhost:5001',
  SOCKET_URL: 'http://localhost:5001',
  MEDIA_MAX_SIZE_MB: 100,
  MEDIA_QUOTA_MB_PER_USER: 1024,
  MEDIA_ALLOWED_MIMETYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ],
  MEDIA_PRESIGNED_TTL_SECONDS: 300,
  MEDIA_UPLOAD_LIMIT_PER_MINUTE: 10,
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<RuntimeConfig>;

export const config: RuntimeConfig = {
  API_BASE: typeof extra.API_BASE === 'string' ? extra.API_BASE : defaults.API_BASE,
  SOCKET_URL:
    typeof extra.SOCKET_URL === 'string' ? extra.SOCKET_URL : defaults.SOCKET_URL,
  MEDIA_MAX_SIZE_MB:
    typeof extra.MEDIA_MAX_SIZE_MB === 'number'
      ? extra.MEDIA_MAX_SIZE_MB
      : defaults.MEDIA_MAX_SIZE_MB,
  MEDIA_QUOTA_MB_PER_USER:
    typeof extra.MEDIA_QUOTA_MB_PER_USER === 'number'
      ? extra.MEDIA_QUOTA_MB_PER_USER
      : defaults.MEDIA_QUOTA_MB_PER_USER,
  MEDIA_ALLOWED_MIMETYPES: Array.isArray(extra.MEDIA_ALLOWED_MIMETYPES)
    ? extra.MEDIA_ALLOWED_MIMETYPES
    : defaults.MEDIA_ALLOWED_MIMETYPES,
  MEDIA_PRESIGNED_TTL_SECONDS:
    typeof extra.MEDIA_PRESIGNED_TTL_SECONDS === 'number'
      ? extra.MEDIA_PRESIGNED_TTL_SECONDS
      : defaults.MEDIA_PRESIGNED_TTL_SECONDS,
  MEDIA_UPLOAD_LIMIT_PER_MINUTE:
    typeof extra.MEDIA_UPLOAD_LIMIT_PER_MINUTE === 'number'
      ? extra.MEDIA_UPLOAD_LIMIT_PER_MINUTE
      : defaults.MEDIA_UPLOAD_LIMIT_PER_MINUTE,
};

export function maxUploadBytes(): number {
  return config.MEDIA_MAX_SIZE_MB * 1024 * 1024;
}

export function isAllowedMimetype(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return config.MEDIA_ALLOWED_MIMETYPES.includes(mime);
}
