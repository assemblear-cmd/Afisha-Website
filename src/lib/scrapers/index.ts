import { prisma } from '@/lib/prisma';

// A single repertoire entry as pulled from a theater's site, before it is
// persisted as a Show row.
export interface ScrapedShow {
  externalId: string;
  title: string;
  description?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  venue?: string | null;
  category?: string | null;
  priceText?: string | null;
  priceCents?: number | null;
  currency?: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

export interface TheaterScraper {
  key: string;
  fetchShows(theater: { website: string }): Promise<ScrapedShow[]>;
}

// ---- Generic JSON-LD Event extractor --------------------------------------
// Many theater / ticketing sites embed schema.org Event data in
// <script type="application/ld+json">. This pulls those out and is the default
// strategy a per-theater adapter reuses by pointing it at a cartelera URL.
// Sites without JSON-LD yield [] until a bespoke parser is added.

/* eslint-disable @typescript-eslint/no-explicit-any */
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parsePrice(offers: any): { priceCents: number | null; priceText: string | null; currency: string } {
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

function nodeToShow(node: any, pageUrl: string): ScrapedShow | null {
  const types = asArray(node['@type']).map((t) => String(t).toLowerCase());
  if (!types.some((t) => t.includes('event')) || !node.name) return null;

  const url = node.url ?? node['@id'] ?? pageUrl;
  const start = node.startDate ? new Date(node.startDate) : null;
  const end = node.endDate ? new Date(node.endDate) : null;
  const location = asArray(node.location)[0];
  const image = asArray(node.image)[0];
  const { priceCents, priceText, currency } = parsePrice(node.offers);

  return {
    externalId: String(url),
    title: String(node.name).trim(),
    description: node.description ? String(node.description).slice(0, 2000) : null,
    startsAt: start && !isNaN(start.getTime()) ? start : null,
    endsAt: end && !isNaN(end.getTime()) ? end : null,
    venue: location?.name ? String(location.name) : null,
    category: 'teatro',
    priceText,
    priceCents,
    currency,
    sourceUrl: typeof url === 'string' ? url : null,
    imageUrl: typeof image === 'string' ? image : (image?.url ?? null),
  };
}

export async function extractJsonLdEvents(pageUrl: string): Promise<ScrapedShow[]> {
  const res = await fetch(pageUrl, {
    headers: {
      'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl; theater repertoire aggregator)',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageUrl}`);
  const html = await res.text();

  const blocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const shows: ScrapedShow[] = [];
  for (const m of blocks) {
    let data: any;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue; // skip malformed blocks
    }
    // JSON-LD may be a single node, an array, or a @graph container.
    const nodes = asArray(data).flatMap((d: any) => (d['@graph'] ? asArray(d['@graph']) : [d]));
    for (const node of nodes) {
      const show = nodeToShow(node, pageUrl);
      if (show) shows.push(show);
    }
  }
  // Dedup by externalId.
  return [...new Map(shows.map((s) => [s.externalId, s])).values()];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- Per-theater adapters --------------------------------------------------
// First-cut reference adapters point the generic extractor at a cartelera URL.
// Add more here keyed by Theater.adapter; bespoke HTML parsers can replace the
// JSON-LD strategy per site as needed.

function jsonLdAdapter(key: string, carteleraPath: string): TheaterScraper {
  return {
    key,
    async fetchShows(theater) {
      const base = theater.website.replace(/\/+$/, '');
      const url = carteleraPath.startsWith('http') ? carteleraPath : `${base}${carteleraPath}`;
      return extractJsonLdEvents(url);
    },
  };
}

// ---- Teatro Municipal de Santiago (live reference adapter) -----------------
// municipal.cl is WordPress; the repertoire lives in the custom `shows` post
// type, exposed read-only at /wp-json/wp/v2/shows. One API call (no per-show
// page fetches): title / venue / category / image come straight from the REST
// item, and the function date is parsed from the Spanish text in content.

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;|&#0?38;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8217;|&#8216;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

// Earliest upcoming "DD de MMMM [de YYYY]" date in the text. Year is inferred
// when omitted; an evening (19:00) function time is assumed.
function parseNextSpanishDate(text: string): Date | null {
  // Handles single dates and ranges ("del 6 al 9 de julio") — takes the first day.
  const re =
    /(?:del\s+)?(\d{1,2})(?:\s+al\s+\d{1,2})?\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?/gi;
  const now = Date.now();
  const grace = 12 * 60 * 60 * 1000;
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    const day = parseInt(m[1], 10);
    const month = MONTHS_ES[m[2].toLowerCase()];
    if (month == null) continue;
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    let t = new Date(year, month, day, 19, 0, 0).getTime();
    if (!m[3] && t < now - 30 * 864e5) t = new Date(year + 1, month, day, 19, 0, 0).getTime();
    if (isNaN(t)) continue;
    if (t >= now - grace && (best == null || t < best)) best = t;
  }
  return best == null ? null : new Date(best);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Image source, most-reliable first: Yoast og:image (always populated on this
// WP+Yoast site), then the featured media, then a content <img> (content images
// are lazy-loaded, so accept data-src / data-lazy-src too).
function pickImage(item: any, contentHtml: string): string | null {
  const og = item?.yoast_head_json?.og_image?.[0]?.url;
  if (typeof og === 'string' && og) return og;
  const feat = item?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (typeof feat === 'string' && feat) return feat;
  const m = contentHtml.match(/<img[^>]+(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i);
  return m && !/^data:image|placeholder|blank\.gif/i.test(m[1]) ? m[1] : null;
}

function termName(item: any, taxonomy: string): string | null {
  const groups: any[] = item?._embedded?.['wp:term'] ?? [];
  for (const g of groups) for (const t of g) if (t.taxonomy === taxonomy) return t.name as string;
  return null;
}

// The `shows` CPT also holds non-performances (digital content, guided tours,
// summer courses, costume sales). Filter those out by category and title.
const MUNICIPAL_EXCLUDED_CATEGORIES = new Set(['Cartelera digital', 'Visitas guiadas temáticas']);
const MUNICIPAL_EXCLUDED_TITLE = /venta de vestuario|curso\b|visita guiada|visita tem[aá]tica|c[aá]psula/i;

function isMunicipalPerformance(category: string | null, title: string): boolean {
  if (category && MUNICIPAL_EXCLUDED_CATEGORIES.has(category)) return false;
  return !MUNICIPAL_EXCLUDED_TITLE.test(title);
}

// Image + headline date aren't in the REST list; each show page carries them as
// og:image and og:description / <title>. One fetch gets both (low-noise vs.
// scanning the whole page body, which is full of other shows' dates).
// Teatro Municipal show pages have a "FECHAS" section whose first dated line is
// the real function ("Domingo 9 de agosto – 19:00 horas"). Presale dates
// ("Inicio de preventa…") sit under PREVENTA, so we scope to the FECHAS block
// (stopping at the next section) and take the earliest upcoming date there.
function parseMunicipalDate(html: string): Date | null {
  const idx = html.search(/FECHAS/i);
  let block: string;
  if (idx >= 0) {
    block = html.slice(idx, idx + 1500);
    const stop = block.slice(6).search(/PREVENTA|PROGRAMA|ELENCO|PRECIOS|DURACI[ÓO]N|ENTRADAS|ABONO/i);
    if (stop >= 0) block = block.slice(0, stop + 6);
  } else {
    block = stripTags(html).slice(0, 12000); // no FECHAS block — best-effort
  }
  const text = stripTags(block);
  const re =
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?(?:\s*[–-]\s*(\d{1,2}):(\d{2}))?/gi;
  const now = Date.now();
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    const day = parseInt(m[1], 10);
    const month = MONTHS_ES[m[2].toLowerCase()];
    if (month == null) continue;
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    const hh = m[4] ? parseInt(m[4], 10) : 19;
    const mm = m[5] ? parseInt(m[5], 10) : 0;
    let t = new Date(year, month, day, hh, mm).getTime();
    if (!m[3] && t < now - 30 * 864e5) t = new Date(year + 1, month, day, hh, mm).getTime();
    if (isNaN(t)) continue;
    if (t >= now - 12 * 36e5 && (best == null || t < best)) best = t;
  }
  return best == null ? null : new Date(best);
}

async function fetchShowPageMeta(url: string): Promise<{ imageUrl: string | null; startsAt: Date | null }> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { imageUrl: null, startsAt: null };
    const html = await res.text();
    const ogImg =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      null;
    // og:image is usually absent; fall back to the first uploaded content image
    // (the show poster), skipping logos/icons by requiring an uploads path.
    const contentImg =
      html.match(
        /<img[^>]+src=["'](https?:\/\/[^"']*\/(?:wp-content|uploads|cms)\/[^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i
      )?.[1] ?? null;
    return { imageUrl: ogImg ?? contentImg, startsAt: parseMunicipalDate(html) };
  } catch {
    return { imageUrl: null, startsAt: null };
  }
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export const municipalScraper: TheaterScraper = {
  key: 'municipal',
  async fetchShows(theater) {
    const base = theater.website.replace(/\/+$/, '');
    const url = `${base}/wp-json/wp/v2/shows?per_page=60&_embed`;
    const res = await fetch(url, {
      headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const items: any[] = await res.json();

    const shows: ScrapedShow[] = [];
    for (const it of items) {
      const link: string | undefined = it?.link;
      const title = decodeEntities(it?.title?.rendered ?? '');
      if (!link || !title) continue;
      const category = termName(it, 'category_show');
      if (!isMunicipalPerformance(category, title)) continue;
      const contentHtml: string = it?.content?.rendered ?? '';
      const excerptHtml: string = it?.excerpt?.rendered ?? '';
      shows.push({
        externalId: link,
        title,
        description: decodeEntities(excerptHtml).slice(0, 600) || null,
        // Prefer the excerpt's headline date, then fall back to content.
        startsAt:
          parseNextSpanishDate(stripTags(excerptHtml)) ??
          parseNextSpanishDate(stripTags(contentHtml)),
        venue: termName(it, 'sala_show'),
        category: category ?? 'teatro',
        priceText: null,
        priceCents: null,
        currency: 'CLP',
        sourceUrl: link,
        imageUrl: pickImage(it, contentHtml),
      });
    }

    // Enrich missing image / date from each show page's meta (limited concurrency).
    await mapLimit(shows, 6, async (s) => {
      if (!s.sourceUrl) return;
      const meta = await fetchShowPageMeta(s.sourceUrl);
      if (!s.imageUrl) s.imageUrl = meta.imageUrl;
      // The FECHAS-block date is more precise than the REST text guess.
      if (meta.startsAt) s.startsAt = meta.startsAt;
    });

    return shows;
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const SCRAPERS: Record<string, TheaterScraper> = {
  municipal: municipalScraper,
  gam: jsonLdAdapter('gam', '/cartelera/'),
};

// ---- Orchestrator ----------------------------------------------------------

export interface ScrapeResult {
  theater: string;
  ok: boolean;
  found: number;
  upserted: number;
  error?: string;
}

/**
 * Runs every active theater that has an adapter, upserting its shows. Each
 * theater is isolated: a failure is recorded on the Theater row and never
 * aborts the others. Idempotent — re-running updates `lastSeenAt` and details.
 */
export async function runScrape(): Promise<ScrapeResult[]> {
  const theaters = await prisma.theater.findMany({
    where: { isActive: true, adapter: { not: null } },
  });

  const results: ScrapeResult[] = [];

  for (const theater of theaters) {
    const scraper = theater.adapter ? SCRAPERS[theater.adapter] : undefined;
    const now = new Date();

    if (!scraper) {
      results.push({
        theater: theater.slug,
        ok: false,
        found: 0,
        upserted: 0,
        error: `no adapter "${theater.adapter}"`,
      });
      continue;
    }

    try {
      const shows = await scraper.fetchShows(theater);
      let upserted = 0;
      for (const s of shows) {
        await prisma.show.upsert({
          where: { theaterId_externalId: { theaterId: theater.id, externalId: s.externalId } },
          create: {
            theaterId: theater.id,
            externalId: s.externalId,
            title: s.title,
            description: s.description ?? null,
            startsAt: s.startsAt ?? null,
            endsAt: s.endsAt ?? null,
            venue: s.venue ?? null,
            category: s.category ?? 'teatro',
            priceText: s.priceText ?? null,
            priceCents: s.priceCents ?? null,
            currency: s.currency ?? 'CLP',
            sourceUrl: s.sourceUrl ?? null,
            imageUrl: s.imageUrl ?? null,
            firstSeenAt: now,
            lastSeenAt: now,
            isActive: true,
          },
          update: {
            title: s.title,
            description: s.description ?? null,
            startsAt: s.startsAt ?? null,
            endsAt: s.endsAt ?? null,
            venue: s.venue ?? null,
            priceText: s.priceText ?? null,
            priceCents: s.priceCents ?? null,
            currency: s.currency ?? 'CLP',
            sourceUrl: s.sourceUrl ?? null,
            imageUrl: s.imageUrl ?? null,
            lastSeenAt: now,
            isActive: true,
          },
        });
        upserted++;
      }
      await prisma.theater.update({
        where: { id: theater.id },
        data: { lastScrapedAt: now, lastScrapeOk: true, lastError: null },
      });
      results.push({ theater: theater.slug, ok: true, found: shows.length, upserted });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await prisma.theater.update({
        where: { id: theater.id },
        data: { lastScrapedAt: now, lastScrapeOk: false, lastError: error.slice(0, 500) },
      });
      results.push({ theater: theater.slug, ok: false, found: 0, upserted: 0, error });
    }
  }

  return results;
}
