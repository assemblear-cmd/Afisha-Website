export function formatPrice(cents: number): string {
  if (cents <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(d: number): number {
  return Math.round(d * 100);
}

// This is a Santiago-only listings app, so dates render in America/Santiago
// regardless of the server's timezone (UTC on Vercel). Without this, stored
// instants would display shifted by Chile's offset.
const DISPLAY_TZ = 'America/Santiago';

export function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  }).format(date);
}

export function formatTime(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DISPLAY_TZ,
  }).format(date);
}

export function formatDateTime(d: Date | string): string {
  return `${formatDate(d)} · ${formatTime(d)}`;
}
