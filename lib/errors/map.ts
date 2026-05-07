import { ApiError, type ToastLevel } from '../types';

export interface UxError {
  title: string;
  message: string;
  level: ToastLevel;
  recoveryHint?: string;
}

export function mapApiError(error: unknown): UxError {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Something went wrong',
      message: error instanceof Error ? error.message : 'Unexpected error',
      level: 'error',
    };
  }
  switch (error.code) {
    case 'INVALID_REQUEST':
      return {
        title: 'Bad request',
        message: error.message || 'The request was invalid.',
        level: 'warning',
      };
    case 'INVALID_FIELD':
      return {
        title: 'Check your input',
        message: error.field
          ? `Field “${error.field}” is invalid.`
          : error.message || 'A field is invalid.',
        level: 'warning',
      };
    case 'UNAUTHORIZED':
      return {
        title: 'Not signed in',
        message: 'Your API key is missing or invalid.',
        level: 'error',
        recoveryHint: 'Add it under Settings → API key.',
      };
    case 'FORBIDDEN':
      return {
        title: 'Not allowed',
        message: 'You don’t have permission to do that.',
        level: 'error',
      };
    case 'NOT_FOUND':
      return {
        title: 'Not found',
        message: 'This item is gone or never existed.',
        level: 'info',
      };
    case 'FILE_TOO_LARGE':
      return {
        title: 'File too big',
        message: error.max_size_mb
          ? `Max upload is ${error.max_size_mb} MB.`
          : 'That file exceeds the upload limit.',
        level: 'warning',
      };
    case 'QUOTA_EXCEEDED':
      return {
        title: 'Storage full',
        message: error.quota_mb
          ? `You have used your ${error.quota_mb} MB quota.`
          : 'You’ve used your storage quota.',
        level: 'warning',
        recoveryHint: 'Delete some items to free up space.',
      };
    case 'UNSUPPORTED_MEDIA_TYPE':
      return {
        title: 'Unsupported file',
        message: error.detected_mimetype
          ? `We can’t accept ${error.detected_mimetype} files yet.`
          : 'That file type isn’t supported.',
        level: 'warning',
      };
    case 'INVALID_RANGE':
      return {
        title: 'Playback hiccup',
        message: 'The player asked for an invalid byte range.',
        level: 'info',
        recoveryHint: 'Reset the position to the start.',
      };
    case 'RATE_LIMITED':
      return {
        title: 'Slow down',
        message: error.retry_after_seconds
          ? `Try again in ${error.retry_after_seconds}s.`
          : 'Too many uploads in a short time.',
        level: 'warning',
      };
    case 'STORAGE_UNAVAILABLE':
      return {
        title: 'Storage hiccup',
        message: 'Our storage is briefly unreachable. Please retry.',
        level: 'error',
      };
    case 'INTERNAL_ERROR':
      return {
        title: 'Server error',
        message: 'Something broke on our side.',
        level: 'error',
      };
    case 'NETWORK_ERROR':
      return {
        title: 'Network error',
        message: 'Check your connection and try again.',
        level: 'error',
      };
    default:
      return {
        title: 'Something went wrong',
        message: error.message,
        level: 'error',
      };
  }
}
