/**
 * Date formatting helpers. Backend dates are ISO-8601 with timezone.
 * Never inline `new Date(x).toLocaleString()` — always go through this module.
 */

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateFmt.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateTimeFmt.format(d);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (absDiff < MINUTE) return rtf.format(Math.round(diff / SECOND), 'second');
  if (absDiff < HOUR) return rtf.format(Math.round(diff / MINUTE), 'minute');
  if (absDiff < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (absDiff < WEEK) return rtf.format(Math.round(diff / DAY), 'day');
  return formatDate(iso);
}
