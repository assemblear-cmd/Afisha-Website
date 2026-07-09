import { normalizeEventCategories } from '@/lib/taxonomy';
import {
  type ScrapedShow,
  type TheaterScraper,
  decodeEntities,
  extractJsonLdEventsFromHtml,
  fetchText,
  isoToInstant,
  mapLimit,
} from './shared';

// Cross-city event platforms (Eventbrite, Fever, viagogo, StubHub) scanned on
// a weekly cadence (see /api/cron/scrape-platforms), unlike venue sites which
// are scraped daily. Each platform is a Theater row whose `adapter` is one of
// PLATFORM_ADAPTER_KEYS, so the existing orchestrator, per-source error state
// and Show upsert flow are reused unchanged.
//
// These are third-party marketplaces without stable public APIs, so every
// adapter is multi-strategy and fails soft:
//   1. schema.org Event JSON-LD (SEO markup on listing pages),
//   2. embedded state JSON (window.__SERVER_DATA__ / <script type="application/json">)
//      mined for event-shaped objects,
//   3. per-event detail pages discovered from the listing (Fever).
// A page yielding zero events is recorded on the Theater row (lastScrapeOk /
// lastError) and never blocks other sources. viagogo/StubHub sit behind
// aggressive bot protection; when they block the fetch the scan just reports
// the HTTP error for that source.

export const PLATFORM_ADAPTER_KEYS = new Set(['eventbrite', 'feverup', 'viagogo', 'stubhub']);

// ---- Santiago targeting ------------------------------------------------------
// Marketplace pages mix global inventory; events must be kept only when their
// venue/address places them in Greater Santiago. Named false friends
// ("Estadio Santiago Bernabéu", "Santiago de Compostela") are excluded first.

const NON_SANTIAGO_RE =
  /bernab[eé]u|compostela|santiago\s+de\s+cuba|santiago\s+de\s+los\s+caballeros|santiago\s+del\s+estero/i;

const SANTIAGO_RE =
  /\bsantiago\b|regi[oó]n\s+metropolitana|metropolitan(?:a|\s+region)|\bprovidencia\b|\b[ñn]u[ñn]oa\b|las\s+condes|vitacura|la\s+reina\b|recoleta|estaci[oó]n\s+central|maip[uú]|la\s+florida|puente\s+alto|huechuraba|lo\s+barnechea|quilicura|cerrillos|san\s+miguel|macul|pe[ñn]alol[eé]n|independencia|conchal[ií]|renca\b|la\s+cisterna|san\s+joaqu[ií]n|quinta\s+normal|cerro\s+navia|lo\s+prado|pudahuel|san\s+bernardo|lampa\b|colina\b/i;

export function isSantiagoLocation(text: string | null | undefined): boolean {
  if (!text) return false;
  if (NON_SANTIAGO_RE.test(text)) return false;
  return SANTIAGO_RE.test(text);
}

type LocatedShow = ScrapedShow & { locationText?: string | null };

function keepSantiago(shows: LocatedShow[], mode: 'require' | 'city-scoped'): LocatedShow[] {
  return shows.filter((s) => {
    const text = [s.locationText, s.venue].filter(Boolean).join(', ');
    if (NON_SANTIAGO_RE.test(text)) return false;
    // City-scoped listings (eventbrite /d/chile--santiago/, feverup /es/santiago)
    // are already filtered by the platform; only explicit mismatches are dropped.
    if (mode === 'city-scoped') return true;
    return isSantiagoLocation(text);
  });
}

// ---- Embedded-JSON event mining ----------------------------------------------
// Listing pages ship their search results as JSON: Eventbrite in a
// `window.__SERVER_DATA__ = {...}` assignment, StubHub/viagogo inside
// <script type="application/json"> blobs. Shapes drift, so instead of pinning
// one schema we walk every blob and collect objects that look like events
// (a name, a parseable date, and a link).

export type MinedEvent = {
  name: string;
  url: string;
  dateRaw: string | null;
  venueName: string | null;
  locationText: string | null;
  imageUrl: string | null;
  priceValue: number | null;
  currency: string | null;
  categoryText: string | null;
};

function firstString(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Extracts the balanced {...} / [...] JSON literal starting at `start`. */
export function sliceBalancedJson(text: string, start: number): string | null {
  const open = text[start];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  const limit = Math.min(text.length, start + 3_000_000);
  for (let i = start; i < limit; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractEmbeddedJsonBlobs(html: string): unknown[] {
  const blobs: unknown[] = [];
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      blobs.push(JSON.parse(m[1].trim()));
    } catch {
      // malformed/truncated blob — skip
    }
  }
  for (const m of html.matchAll(/(?:window\.)?__[A-Z0-9_]{4,}__\s*=\s*/g)) {
    const start = (m.index ?? 0) + m[0].length;
    const raw = sliceBalancedJson(html, start);
    if (!raw) continue;
    try {
      blobs.push(JSON.parse(raw));
    } catch {
      // not a JSON literal (e.g. a function) — skip
    }
  }
  return blobs;
}

const NAME_KEYS = ['name', 'eventName', 'title'];
const URL_KEYS = ['url', 'eventUrl', 'webURI', 'webUri', 'tickets_url', 'ticketsUrl', 'link'];
const DATE_KEYS = [
  'startDate',
  'start_date',
  'eventDateLocal',
  'eventDateUTC',
  'dateLocal',
  'localDate',
  'startTime',
  'date',
];
const VENUE_KEYS = ['venueName', 'formattedVenueName', 'venue_name'];
const CITY_KEYS = [
  'formattedCityStateCountry',
  'formattedCityState',
  'cityName',
  'city',
  'venueCity',
  'localized_address_display',
];
const CATEGORY_KEYS = ['categoryName', 'genreName', 'category', 'genre', 'segment'];

const ISOISH_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function mineDate(node: Record<string, unknown>): string | null {
  // Eventbrite search results split date and time ("2026-08-01" + "19:00").
  const startDate = node['start_date'];
  const startTime = node['start_time'];
  if (typeof startDate === 'string' && ISOISH_DATE_RE.test(startDate)) {
    return typeof startTime === 'string' && /^\d{2}:\d{2}/.test(startTime)
      ? `${startDate}T${startTime}`
      : startDate;
  }
  // Eventbrite API-style nested start { local, utc, timezone }.
  const start = node['start'];
  if (start && typeof start === 'object' && !Array.isArray(start)) {
    const nested = firstString(start as Record<string, unknown>, ['utc', 'local']);
    if (nested && ISOISH_DATE_RE.test(nested)) return nested;
  }
  const flat = firstString(node, DATE_KEYS);
  return flat && ISOISH_DATE_RE.test(flat) ? flat : null;
}

function mineVenue(node: Record<string, unknown>): { venueName: string | null; locationText: string | null } {
  const parts: string[] = [];
  let venueName = firstString(node, VENUE_KEYS);

  const nested = node['primary_venue'] ?? node['venue'] ?? node['location'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const nestedObj = nested as Record<string, unknown>;
    venueName = venueName ?? firstString(nestedObj, ['name', 'venue_name', 'venueName']);
    const address = nestedObj['address'];
    if (typeof address === 'string') parts.push(address);
    else if (address && typeof address === 'object') {
      const addressObj = address as Record<string, unknown>;
      for (const key of [
        'localized_address_display',
        'city',
        'addressLocality',
        'region',
        'addressRegion',
        'country',
      ]) {
        const value = addressObj[key];
        if (typeof value === 'string' && value.trim()) parts.push(value.trim());
      }
    }
    const nestedCity = firstString(nestedObj, CITY_KEYS);
    if (nestedCity) parts.push(nestedCity);
  }

  const flatCity = firstString(node, CITY_KEYS);
  if (flatCity) parts.push(flatCity);
  if (venueName) parts.unshift(venueName);

  return { venueName, locationText: parts.length ? parts.join(', ') : null };
}

function mineImage(node: Record<string, unknown>): string | null {
  const image = node['image'] ?? node['imageUrl'] ?? node['image_url'];
  if (typeof image === 'string') return image;
  if (image && typeof image === 'object' && !Array.isArray(image)) {
    const imageObj = image as Record<string, unknown>;
    if (typeof imageObj['url'] === 'string') return imageObj['url'];
    const original = imageObj['original'];
    if (original && typeof original === 'object' && typeof (original as any)['url'] === 'string') {
      return (original as any)['url'];
    }
  }
  return null;
}

function minePrice(node: Record<string, unknown>): { priceValue: number | null; currency: string | null } {
  const availability = node['ticket_availability'];
  if (availability && typeof availability === 'object') {
    const minPrice = (availability as Record<string, unknown>)['minimum_ticket_price'];
    if (minPrice && typeof minPrice === 'object') {
      const priceObj = minPrice as Record<string, unknown>;
      const raw = priceObj['major_value'] ?? priceObj['value'];
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
      if (isFinite(num)) {
        return {
          priceValue: num,
          currency: typeof priceObj['currency'] === 'string' ? priceObj['currency'] : null,
        };
      }
    }
  }
  for (const key of ['minPrice', 'min_price', 'price', 'lowPrice']) {
    const raw = node[key];
    const num = typeof raw === 'number' ? raw : NaN;
    if (isFinite(num) && num >= 0) {
      return {
        priceValue: num,
        currency: typeof node['currency'] === 'string' ? (node['currency'] as string) : null,
      };
    }
  }
  return { priceValue: null, currency: null };
}

export function mineEventObjects(root: unknown): MinedEvent[] {
  const out: MinedEvent[] = [];
  const seen = new Set<object>();
  let visited = 0;

  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 14 || visited > 50_000) return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    visited++;

    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }

    const obj = node as Record<string, unknown>;
    const name = firstString(obj, NAME_KEYS);
    const url = firstString(obj, URL_KEYS);
    const dateRaw = mineDate(obj);
    const isOnline = obj['is_online_event'] === true || obj['isOnlineEvent'] === true;

    if (name && url && dateRaw && !isOnline) {
      const { venueName, locationText } = mineVenue(obj);
      const { priceValue, currency } = minePrice(obj);
      out.push({
        name: decodeEntities(name),
        url,
        dateRaw,
        venueName,
        locationText,
        imageUrl: mineImage(obj),
        priceValue,
        currency,
        categoryText: firstString(obj, CATEGORY_KEYS),
      });
    }

    for (const value of Object.values(obj)) visit(value, depth + 1);
  };

  visit(root, 0);
  return out;
}

export function mineEmbeddedEvents(html: string): MinedEvent[] {
  return extractEmbeddedJsonBlobs(html).flatMap(mineEventObjects);
}

// ---- Normalization -------------------------------------------------------

function toAbsoluteUrl(url: string, pageUrl: string): string | null {
  try {
    return new URL(url, pageUrl).toString();
  } catch {
    return null;
  }
}

/** Stable per-event id: the event URL without tracking query/hash noise. */
export function normalizeExternalId(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

function minedToShow(ev: MinedEvent, pageUrl: string): LocatedShow | null {
  const abs = toAbsoluteUrl(ev.url, pageUrl);
  if (!abs) return null;
  const startsAt = ev.dateRaw ? isoToInstant(ev.dateRaw) : null;
  const currency = ev.currency ?? 'CLP';
  return {
    externalId: normalizeExternalId(abs),
    title: ev.name,
    description: null,
    startsAt,
    endsAt: null,
    venue: ev.venueName,
    category: ev.categoryText,
    priceText: ev.priceValue != null ? `${ev.priceValue} ${currency}` : null,
    // CLP has no minor unit; storing value * 100 keeps the cents convention.
    priceCents: ev.priceValue != null ? Math.round(ev.priceValue * 100) : null,
    currency,
    sourceUrl: abs,
    imageUrl: ev.imageUrl,
    locationText: ev.locationText,
  };
}

function urlCategoryHint(url: string): string | null {
  if (/concert|concierto/i.test(url)) return 'concierto';
  if (/teatro|theater|theatre/i.test(url)) return 'obra de teatro';
  if (/sport|deporte|futbol|football/i.test(url)) return 'deportes';
  if (/festival/i.test(url)) return 'festival';
  return null;
}

const UPCOMING_GRACE_MS = 12 * 60 * 60 * 1000;

function finalizePlatformShows(
  shows: LocatedShow[],
  options: { categoryHint?: string | null; cap: number }
): ScrapedShow[] {
  const now = Date.now();
  const deduped = [...new Map(shows.map((s) => [normalizeExternalId(s.externalId), s])).values()];
  return deduped
    .filter((s) => s.title && (!s.startsAt || s.startsAt.getTime() >= now - UPCOMING_GRACE_MS))
    .slice(0, options.cap)
    .map(({ locationText: _location, ...s }) => {
      // nodeToShow defaults category to 'teatro' (a venue-scraper convention);
      // on a marketplace that default is noise, so only explicit categories
      // count. The venue name is excluded too ("Teatro X" is not the genre).
      const rawCategory = s.category === 'teatro' ? null : s.category;
      const categories = normalizeEventCategories(
        [rawCategory, options.categoryHint, s.title].filter(Boolean).join(' ')
      );
      return { ...s, externalId: normalizeExternalId(s.externalId), category: categories[0] ?? 'otros', categories };
    });
}

function sourceUrls(theater: { website: string; eventSources?: string[] }, fallback: string[]): string[] {
  const configured = (theater.eventSources ?? []).filter(Boolean);
  return [...new Set(configured.length ? configured : fallback)];
}

function withPageParam(url: string, page: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set('page', String(page));
    return u.toString();
  } catch {
    return url;
  }
}

// ---- Eventbrite ----------------------------------------------------------
// City destination pages (/d/chile--santiago/all-events/) carry the search
// results in window.__SERVER_DATA__ and an ItemList JSON-LD block; both are
// harvested, and up to 3 result pages are walked via ?page=N.

const EVENTBRITE_DEFAULT_SOURCES = ['https://www.eventbrite.cl/d/chile--santiago/all-events/'];
const EVENTBRITE_MAX_PAGES = 3;

export const eventbriteScraper: TheaterScraper = {
  key: 'eventbrite',
  async fetchShows(theater) {
    const shows: LocatedShow[] = [];
    for (const base of sourceUrls(theater, EVENTBRITE_DEFAULT_SOURCES).slice(0, 2)) {
      for (let page = 1; page <= EVENTBRITE_MAX_PAGES; page++) {
        const url = page === 1 ? base : withPageParam(base, page);
        let html: string;
        try {
          html = await fetchText(url, 20000);
        } catch {
          break; // this source is unreachable/blocked — try the next one
        }
        const before = new Set(shows.map((s) => normalizeExternalId(s.externalId)));
        const batch = [
          ...mineEmbeddedEvents(html)
            .map((ev) => minedToShow(ev, url))
            .filter((s): s is LocatedShow => s !== null),
          ...extractJsonLdEventsFromHtml(html, url),
        ].filter((s) => /\/e\//.test(s.externalId)); // only event detail links
        const fresh = batch.filter((s) => !before.has(normalizeExternalId(s.externalId)));
        shows.push(...fresh);
        if (fresh.length === 0) break; // ran past the last page
      }
    }
    return finalizePlatformShows(keepSantiago(shows, 'city-scoped'), { cap: 150 });
  },
};

// ---- Fever ---------------------------------------------------------------
// The city page (feverup.com/es/santiago) links every plan as /m/<id>; each
// plan page embeds a schema.org Event. The city page's own JSON-LD/embedded
// state is harvested first, then a bounded number of plan pages fill the gaps.

const FEVER_DEFAULT_SOURCES = ['https://feverup.com/es/santiago'];
const FEVER_MAX_PLAN_PAGES = 18;

export function discoverFeverPlanUrls(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/(?:https?:\/\/(?:www\.)?feverup\.com)?\/m\/(\d+)[a-z0-9\-/]*/gi)) {
    const abs = toAbsoluteUrl(m[0], pageUrl);
    if (abs) urls.add(normalizeExternalId(abs));
  }
  return [...urls];
}

export const feverupScraper: TheaterScraper = {
  key: 'feverup',
  async fetchShows(theater) {
    const shows: LocatedShow[] = [];
    for (const base of sourceUrls(theater, FEVER_DEFAULT_SOURCES).slice(0, 2)) {
      let html: string;
      try {
        html = await fetchText(base, 20000);
      } catch {
        continue;
      }
      shows.push(...extractJsonLdEventsFromHtml(html, base));
      shows.push(
        ...mineEmbeddedEvents(html)
          .map((ev) => minedToShow(ev, base))
          .filter((s): s is LocatedShow => s !== null)
      );

      const known = new Set(shows.map((s) => normalizeExternalId(s.externalId)));
      const planUrls = discoverFeverPlanUrls(html, base)
        .filter((u) => !known.has(u))
        .slice(0, FEVER_MAX_PLAN_PAGES);
      await mapLimit(planUrls, 6, async (planUrl) => {
        try {
          const planHtml = await fetchText(planUrl, 8000);
          const events = extractJsonLdEventsFromHtml(planHtml, planUrl);
          // A plan page describes one plan; keep its first Event node.
          if (events[0]) shows.push({ ...events[0], externalId: planUrl, sourceUrl: planUrl });
        } catch {
          // one blocked/slow plan page never hides the rest
        }
      });
    }
    return finalizePlatformShows(keepSantiago(shows, 'city-scoped'), { cap: 150 });
  },
};

// ---- viagogo / StubHub -----------------------------------------------------
// Same marketplace engine (SEO geography pages listing resale inventory), so
// one implementation serves both adapter keys. Inventory is global, so a
// strict Santiago location match is required here, unlike the city-scoped
// platforms above.

function marketplaceScraper(key: string, defaultSources: string[]): TheaterScraper {
  return {
    key,
    async fetchShows(theater) {
      const shows: LocatedShow[] = [];
      for (const url of sourceUrls(theater, defaultSources).slice(0, 3)) {
        let html: string;
        try {
          html = await fetchText(url, 20000);
        } catch {
          continue; // bot wall or downtime on one page — try the others
        }
        const hint = urlCategoryHint(url);
        const batch = [
          ...extractJsonLdEventsFromHtml(html, url),
          ...mineEmbeddedEvents(html)
            .map((ev) => minedToShow(ev, url))
            .filter((s): s is LocatedShow => s !== null),
        ].map((s) => ({ ...s, category: s.category ?? hint }));
        shows.push(...batch);
      }
      return finalizePlatformShows(keepSantiago(shows, 'require'), { cap: 150 });
    },
  };
}

export const viagogoScraper = marketplaceScraper('viagogo', [
  'https://www.viagogo.com/cl/Santiago',
  'https://www.viagogo.com/cl/Santiago/Entradas-Conciertos',
]);

export const stubhubScraper = marketplaceScraper('stubhub', [
  'https://www.stubhub.cl/entradas-santiago-de-chile/geography/448050/',
]);

export const PLATFORM_SCRAPERS: Record<string, TheaterScraper> = {
  eventbrite: eventbriteScraper,
  feverup: feverupScraper,
  viagogo: viagogoScraper,
  stubhub: stubhubScraper,
};
