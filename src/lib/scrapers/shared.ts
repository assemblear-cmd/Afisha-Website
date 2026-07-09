// Shared building blocks for every scraper adapter (venue sites in ./index.ts,
// cross-city event platforms in ./platforms.ts). Kept free of adapter imports
// so both modules can depend on it without cycles.

// A single repertoire entry as pulled from a source, before it is persisted as
// a Show row.
export interface ScrapedShow {
  externalId: string;
  title: string;
  description?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  venue?: string | null;
  category?: string | null;
  // Controlled event-type slugs (see src/lib/taxonomy.ts). Optional: when an
  // adapter omits it, runScrape derives it from `category`.
  categories?: string[] | null;
  priceText?: string | null;
  priceCents?: number | null;
  currency?: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

export interface TheaterScraper {
  key: string;
  fetchShows(theater: { website: string; eventSources?: string[] }): Promise<ScrapedShow[]>;
}

export const SCRAPER_USER_AGENT =
  'AfishaBot/1.0 (+https://dondego.cl; Santiago events aggregator)';

export function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// ---- Timezone-safe date parsing ---------------------------------------------
// Repertoire dates scraped from venue sites are Santiago wall-clock times.
// `new Date(y, mo, d, ...)` would interpret them in the *host* timezone (UTC on
// Vercel), shifting every showtime by Chile's offset. santiagoTime() pins the
// components to America/Santiago and returns the matching UTC instant; the zone
// offset is read via Intl, so CLT (−04) / CLST (−03) DST is handled with no
// hardcoded value.
const SANTIAGO_TZ = 'America/Santiago';

export function santiagoOffsetMs(utcMs: number): number {
  // (Santiago wall-clock reading of this instant) − (its UTC reading) = offset.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SANTIAGO_TZ,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const f = (type: string) => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };
  return Date.UTC(f('year'), f('month') - 1, f('day'), f('hour'), f('minute'), f('second')) - utcMs;
}

export function santiagoTime(year: number, month: number, day: number, hh = 0, mm = 0): Date {
  // Treat the components as UTC, then subtract Santiago's offset at that instant
  // to land on the UTC instant whose Santiago wall clock matches the input.
  const asUtc = Date.UTC(year, month, day, hh, mm);
  return new Date(asUtc - santiagoOffsetMs(asUtc));
}

// schema.org dates are ISO 8601, but event feeds often omit the timezone
// (e.g. "2026-10-02T19:30:00"). A string carrying an offset (Z or ±hh:mm) is an
// absolute instant; an offset-less one is the venue's Santiago wall-clock time,
// so anchor it there rather than let `new Date()` read it in the host timezone.
export function isoToInstant(value: string): Date | null {
  const s = value.trim();
  if (/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return santiagoTime(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

// ---- HTML / text helpers -----------------------------------------------------

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;|&#0?38;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8217;|&#8216;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': SCRAPER_USER_AGENT },
    cache: 'no-store',
    // A hung host must never stall the whole scan.
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

export async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ---- Generic JSON-LD Event extractor ----------------------------------------
// Many event sites embed schema.org Event data in
// <script type="application/ld+json">. This pulls those out and is the default
// strategy adapters reuse by pointing it at a listing URL. Sites without
// JSON-LD yield [] until a bespoke parser is added.

export function parsePrice(offers: any): { priceCents: number | null; priceText: string | null; currency: string } {
  const offer = asArray(offers)[0];
  if (!offer) return { priceCents: null, priceText: null, currency: 'CLP' };
  const raw = offer.price ?? offer.lowPrice;
  const currency = offer.priceCurrency ?? 'CLP';
  if (raw == null) return { priceCents: null, priceText: null, currency };
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.]/g, ''));
  if (!isFinite(num)) return { priceCents: null, priceText: String(raw), currency };
  // CLP has no minor unit in practice; store CLP * 100 to keep the cents convention.
  return { priceCents: Math.round(num * 100), priceText: `${num} ${currency}`, currency };
}

function jsonLdLocationText(node: any): string | null {
  const location = asArray(node?.location)[0];
  if (!location) return null;
  const address = location.address;
  const parts = [
    location.name,
    typeof address === 'string' ? address : null,
    address?.streetAddress,
    address?.addressLocality,
    address?.addressRegion,
    address?.addressCountry?.name ?? address?.addressCountry,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
  return parts.length ? parts.join(', ') : null;
}

export function nodeToShow(node: any, pageUrl: string): (ScrapedShow & { locationText?: string | null }) | null {
  const types = asArray(node['@type']).map((t) => String(t).toLowerCase());
  if (!types.some((t) => t.includes('event')) || !node.name) return null;

  const url = node.url ?? node['@id'] ?? pageUrl;
  const start = node.startDate ? isoToInstant(String(node.startDate)) : null;
  const end = node.endDate ? isoToInstant(String(node.endDate)) : null;
  const location = asArray(node.location)[0];
  const image = asArray(node.image)[0];
  const { priceCents, priceText, currency } = parsePrice(node.offers);

  return {
    externalId: String(url),
    title: decodeEntities(String(node.name)),
    description: node.description ? String(node.description).slice(0, 2000) : null,
    startsAt: start && !isNaN(start.getTime()) ? start : null,
    endsAt: end && !isNaN(end.getTime()) ? end : null,
    venue: location?.name ? decodeEntities(String(location.name)) : null,
    category: 'teatro',
    priceText,
    priceCents,
    currency,
    sourceUrl: typeof url === 'string' ? url : null,
    imageUrl: typeof image === 'string' ? image : (image?.url ?? null),
    locationText: jsonLdLocationText(node),
  };
}

export function extractJsonLdEventsFromHtml(
  html: string,
  pageUrl: string
): (ScrapedShow & { locationText?: string | null })[] {
  const blocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const shows: (ScrapedShow & { locationText?: string | null })[] = [];
  for (const m of blocks) {
    let data: any;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue; // skip malformed blocks
    }
    // JSON-LD may be a single node, an array, a @graph container, or an
    // ItemList whose itemListElement entries wrap the Event nodes.
    const roots = asArray(data).flatMap((d: any) => (d['@graph'] ? asArray(d['@graph']) : [d]));
    const nodes = roots.flatMap((node: any) => {
      const types = asArray(node?.['@type']).map((t) => String(t).toLowerCase());
      if (types.includes('itemlist') && Array.isArray(node.itemListElement)) {
        return node.itemListElement.map((el: any) => el?.item ?? el);
      }
      return [node];
    });
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const show = nodeToShow(node, pageUrl);
      if (show) shows.push(show);
    }
  }
  // Dedup by externalId.
  return [...new Map(shows.map((s) => [s.externalId, s])).values()];
}

export async function extractJsonLdEvents(pageUrl: string): Promise<ScrapedShow[]> {
  return extractJsonLdEventsFromHtml(await fetchText(pageUrl), pageUrl);
}
