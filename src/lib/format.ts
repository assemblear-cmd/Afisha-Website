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

function clpListingAmount(value: number): number {
  // Scraped Show rows historically store CLP as pesos * 100, while organizer
  // TicketType rows store CLP as whole pesos. Accept both in listings.
  return value >= 100000 ? Math.round(value / 100) : value;
}

export function formatListingPrice(
  priceCents: number | null,
  currency = 'CLP',
  freeLabel = 'Free',
  priceText?: string | null
): string {
  if (priceCents == null) return priceText?.trim() ?? '';
  if (priceCents <= 0) return freeLabel;

  const upper = currency.toUpperCase();
  if (upper === 'CLP') {
    return `${new Intl.NumberFormat('es-CL').format(clpListingAmount(priceCents))} ${upper}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: upper,
  }).format(priceCents / 100);
}

// This is a Santiago-only listings app, so dates render in America/Santiago
// regardless of the server's timezone (UTC on Vercel). Without this, stored
// instants would display shifted by Chile's offset.
const DISPLAY_TZ = 'America/Santiago';

// Map the UI's locale codes to BCP-47 tags. Spanish uses Chilean conventions
// (24h clock, "lun, 23 jun"); English keeps US conventions (12h AM/PM). The
// `hour12` flag is left to each locale's default rather than forced. Callers
// that omit `locale` keep the previous en-US behavior.
const LOCALE_TAGS: Record<string, string> = { es: 'es-CL', en: 'en-US' };

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.en;
}

export function formatDate(d: Date | string, locale = 'en'): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  }).format(date);
}

export function formatTime(d: Date | string, locale = 'en'): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DISPLAY_TZ,
  }).format(date);
}

export function formatDateTime(d: Date | string, locale = 'en'): string {
  return `${formatDate(d, locale)} · ${formatTime(d, locale)}`;
}
