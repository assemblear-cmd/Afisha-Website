import { prisma } from '@/lib/prisma';
import { normalizeEventCategories } from '@/lib/taxonomy';

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

// ---- Generic JSON-LD Event extractor --------------------------------------
// Many theater / ticketing sites embed schema.org Event data in
// <script type="application/ld+json">. This pulls those out and is the default
// strategy a per-theater adapter reuses by pointing it at a cartelera URL.
// Sites without JSON-LD yield [] until a bespoke parser is added.

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
  const start = node.startDate ? isoToInstant(String(node.startDate)) : null;
  const end = node.endDate ? isoToInstant(String(node.endDate)) : null;
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

function extractJsonLdEventsFromHtml(html: string, pageUrl: string): ScrapedShow[] {
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

export async function extractJsonLdEvents(pageUrl: string): Promise<ScrapedShow[]> {
  const res = await fetch(pageUrl, {
    headers: {
      'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl; theater repertoire aggregator)',
    },
    cache: 'no-store',
    // A hung host must never stall the whole scan.
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${pageUrl}`);
  return extractJsonLdEventsFromHtml(await res.text(), pageUrl);
}

// ---- Generic JSON-LD fallback adapter ---------------------------------------
// Default for every venue without a bespoke adapter: harvests schema.org Event
// JSON-LD from the venue's eventSources (falling back to the website). Sites
// without JSON-LD simply yield 0 shows until a bespoke parser is written, so
// running it against all sources is safe. Categories are derived from the
// event title (same approach as the seed), not from the venue type.
const genericJsonLdScraper: TheaterScraper = {
  key: 'jsonld',
  async fetchShows(theater) {
    const urls = [
      ...new Set([...(theater.eventSources ?? []), theater.website].filter(Boolean)),
    ].slice(0, 3);

    const shows: ScrapedShow[] = [];
    for (const url of urls) {
      try {
        shows.push(...(await extractJsonLdEvents(url)));
      } catch {
        // One unreachable/blocked URL never hides the venue's other sources.
      }
    }

    return [...new Map(shows.map((s) => [s.externalId, s])).values()].map((s) => ({
      ...s,
      category: s.category === 'teatro' ? null : s.category,
      categories: normalizeEventCategories(`${s.title} ${s.venue ?? ''}`),
    }));
  },
};

// ---- Per-theater adapters --------------------------------------------------
// Each adapter is keyed by Theater.adapter and maps a site's repertoire to
// ScrapedShow[]. They reuse the generic extractJsonLdEvents() where a site has
// schema.org markup (see gamScraper), or parse bespoke HTML (see municipal).

// ---- Teatro Municipal de Santiago (live reference adapter) -----------------
// municipal.cl is WordPress; the repertoire lives in the custom `shows` post
// type, exposed read-only at /wp-json/wp/v2/shows. One API call (no per-show
// page fetches): title / venue / category / image come straight from the REST
// item, and the function date is parsed from the Spanish text in content.

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

// Repertoire dates scraped from theater sites are Santiago wall-clock times.
// `new Date(y, mo, d, ...)` would interpret them in the *host* timezone (UTC on
// Vercel), shifting every showtime by Chile's offset. santiagoTime() pins the
// components to America/Santiago and returns the matching UTC instant; the zone
// offset is read via Intl, so CLT (−04) / CLST (−03) DST is handled with no
// hardcoded value.
const SANTIAGO_TZ = 'America/Santiago';

function santiagoOffsetMs(utcMs: number): number {
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

function santiagoTime(year: number, month: number, day: number, hh = 0, mm = 0): Date {
  // Treat the components as UTC, then subtract Santiago's offset at that instant
  // to land on the UTC instant whose Santiago wall clock matches the input.
  const asUtc = Date.UTC(year, month, day, hh, mm);
  return new Date(asUtc - santiagoOffsetMs(asUtc));
}

// schema.org dates are ISO 8601, but theater feeds often omit the timezone
// (e.g. GAM emits "2026-10-02T19:30:00"). A string carrying an offset (Z or
// ±hh:mm) is an absolute instant; an offset-less one is the venue's Santiago
// wall-clock time, so anchor it there rather than let `new Date()` read it in
// the host timezone.
function isoToInstant(value: string): Date | null {
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
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
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
    let t = santiagoTime(year, month, day, 19, 0).getTime();
    if (!m[3] && t < now - 30 * 864e5) t = santiagoTime(year + 1, month, day, 19, 0).getTime();
    if (isNaN(t)) continue;
    if (t >= now - grace && (best == null || t < best)) best = t;
  }
  return best == null ? null : new Date(best);
}

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
    let t = santiagoTime(year, month, day, hh, mm).getTime();
    if (!m[3] && t < now - 30 * 864e5) t = santiagoTime(year + 1, month, day, hh, mm).getTime();
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

// ---- Centro Gabriela Mistral (GAM) ----------------------------------------
// gam.cl is a Django/Wagtail site with no public API, but every show detail
// page embeds a schema.org Event in JSON-LD. There's no single cartelera page,
// so we crawl selected programming-section listings, collect detail-page URLs,
// and run the generic JSON-LD extractor on each. Archive and open-call pages are
// skipped; pages with no active/upcoming date range drop out.

const GAM_DISCIPLINES: Record<string, string> = {
  teatro: 'Teatro',
  danza: 'Danza',
  'musica-popular': 'Música',
  'musica-clasica': 'Música',
  'nueva-opera': 'Ópera',
  'stand-up-comedy': 'Stand up comedy',
  artesvisuales: 'Exposición',
  actividades: 'Actividad',
  ideasypensamiento: 'Charla',
};

// Listing detail links look like /es/que-hacer-en-gam/<discipline>/<slug>/.
// Skip the archive and open-call pages — they aren't performances.
const GAM_EXCLUDED_SLUG = /\/(?:historico|convocatoria[a-z0-9-]*)\/?$/i;

async function gamDiscoverShowUrls(discipline: string): Promise<string[]> {
  const listUrl = `https://gam.cl/es/que-hacer-en-gam/${discipline}/`;
  const res = await fetch(listUrl, {
    headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const re = new RegExp(`https://gam\\.cl/es/que-hacer-en-gam/${discipline}/[a-z0-9-]+/?`, 'gi');
  const urls = new Set<string>();
  for (const m of html.matchAll(re)) {
    const u = m[0].endsWith('/') ? m[0] : `${m[0]}/`;
    if (!GAM_EXCLUDED_SLUG.test(u)) urls.add(u);
  }
  return [...urls];
}

function isCurrentOrUpcoming(show: ScrapedShow): boolean {
  const grace = 12 * 60 * 60 * 1000;
  const threshold = Date.now() - grace;
  const end = show.endsAt?.getTime();
  if (end != null && !isNaN(end)) return end >= threshold;
  const start = show.startsAt?.getTime();
  return start != null && !isNaN(start) && start >= threshold;
}

function gamPrice(html: string): { priceCents: number | null; priceText: string | null } {
  const text = htmlText(html);
  const amounts = [...text.matchAll(/\$\s*(\d{1,3}(?:\.\d{3})+|\d{4,6})(?:,\d+)?/g)]
    .map((m) => parseClpAmount(m[1]))
    .filter((n): n is number => n != null && isFinite(n) && n >= 0);

  if (amounts.length > 0) {
    const amount = Math.min(...amounts);
    return {
      priceCents: Math.round(amount * 100),
      priceText: `${new Intl.NumberFormat('es-CL').format(Math.round(amount))} CLP`,
    };
  }

  if (/\b(gratis|gratuit[oa]|entrada\s+(?:liberada|libre))\b/i.test(text)) {
    return { priceCents: 0, priceText: '0 CLP' };
  }

  return { priceCents: null, priceText: null };
}

// Each GAM detail page carries one schema.org Event; reuse the generic
// extractor and keep only pages that yield a current/upcoming date or date
// range. The raw category is the section the show was found under; controlled
// slugs are derived from the section plus title so broad buckets like
// "Actividades" can still fill charla / evento-interactivo without noisy
// description words leaking into unrelated categories.
export const gamScraper: TheaterScraper = {
  key: 'gam',
  async fetchShows() {
    const byUrl = new Map<string, string>(); // detail URL -> discipline label
    for (const [disc, label] of Object.entries(GAM_DISCIPLINES)) {
      let urls: string[] = [];
      try {
        urls = await gamDiscoverShowUrls(disc);
      } catch {
        urls = []; // one discipline listing failing never blocks the others
      }
      for (const u of urls) if (!byUrl.has(u)) byUrl.set(u, label);
    }

    const shows: ScrapedShow[] = [];
    await mapLimit([...byUrl.keys()], 6, async (url) => {
      let html = '';
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl; theater repertoire aggregator)' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return;
        html = await res.text();
      } catch {
        return; // a single broken detail page never blocks the others
      }
      const events = extractJsonLdEventsFromHtml(html, url);
      const ev = events[0];
      if (!ev || !isCurrentOrUpcoming(ev)) return;
      const price = gamPrice(html);
      const category = byUrl.get(url) ?? 'Teatro';
      ev.category = category;
      ev.categories = normalizeEventCategories(
        [category, ev.title].filter(Boolean).join(' ')
      );
      ev.priceText = ev.priceText ?? price.priceText;
      ev.priceCents = ev.priceCents ?? price.priceCents;
      ev.venue = ev.venue ? decodeEntities(ev.venue) : null;
      shows.push(ev);
    });

    return shows;
  },
};

// ---- Teatro Municipal de Las Condes ---------------------------------------
// tmlascondes.cl is WordPress, but the public REST posts have empty content and
// no event metadata. The live repertoire is rendered on /estrenos/ as cards;
// each detail page carries the useful parts: exact "Fechas y Horarios", ticket
// URL, price in a small schema.org Event block, and og:image/description.

interface LasCondesCard {
  url: string;
  title: string;
  category: string | null;
  dateText: string | null;
  imageUrl: string | null;
}

function htmlText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const before = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );
  const after = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`,
    'i'
  );
  const value = html.match(before)?.[1] ?? html.match(after)?.[1];
  return value ? decodeEntities(value) : null;
}

function firstClassText(html: string, className: string): string | null {
  const re = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  return decodeEntities(html.match(re)?.[1] ?? '') || null;
}

function parseLasCondesCards(html: string): LasCondesCard[] {
  const cards = new Map<string, LasCondesCard>();
  const articleRe = /<article\b[^>]*class=["'][^"']*\bcartelera-item\b[^"']*["'][\s\S]*?<\/article>/gi;
  for (const m of html.matchAll(articleRe)) {
    const block = m[0];
    const url = decodeEntities(block.match(/<a\s+href=["']([^"']+)/i)?.[1] ?? '');
    const title = firstClassText(block, 'titulo-evento');
    if (!url || !title) continue;
    const category =
      decodeEntities(
        block.match(/class=["'][^"']*tipo-espectaculo[^"']*["'][\s\S]*?<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? ''
      ) || null;
    const dateText = firstClassText(block, 'fecha');
    const imageUrl = decodeEntities(block.match(/background-image:url\(['"]?([^'")]+)['"]?\)/i)?.[1] ?? '') || null;
    cards.set(url, { url, title, category, dateText, imageUrl });
  }
  return [...cards.values()];
}

function parseLasCondesDateText(text: string, requireTime: boolean): Date | null {
  const months = Object.keys(MONTHS_ES).join('|');
  const re = new RegExp(
    `(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)?\\s*` +
      `(\\d{1,2})(?:\\s*(?:al|a|y|[-–])\\s*\\d{1,2})?\\s+de\\s+(${months})` +
      `(?:\\s+(?:de\\s+)?(\\d{4}))?` +
      `(?:\\s*[•·,\\-–]?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(?:horas?|hrs?\\.?|h\\b))?`,
    'gi'
  );
  const now = Date.now();
  const grace = 12 * 60 * 60 * 1000;
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    if (requireTime && !m[4]) continue;
    const day = parseInt(m[1], 10);
    const month = MONTHS_ES[m[2].toLowerCase()];
    if (month == null) continue;
    const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    const hh = m[4] ? parseInt(m[4], 10) : 19;
    const mm = m[5] ? parseInt(m[5], 10) : 0;
    let t = santiagoTime(year, month, day, hh, mm).getTime();
    if (!m[3] && t < now - 30 * 864e5) t = santiagoTime(year + 1, month, day, hh, mm).getTime();
    if (isNaN(t)) continue;
    if (t >= now - grace && (best == null || t < best)) best = t;
  }
  return best == null ? null : new Date(best);
}

function lasCondesJsonLdEvents(html: string): any[] {
  const events: any[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: any;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes = asArray(data).flatMap((d: any) => (d?.['@graph'] ? asArray(d['@graph']) : [d]));
    for (const node of nodes) {
      const types = asArray(node?.['@type']).map((t) => String(t).toLowerCase());
      if (types.some((t) => t.includes('event'))) events.push(node);
    }
  }
  return events;
}

function parseClpAmount(value: unknown): number | null {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const normalized = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned)
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  const n = parseFloat(normalized);
  return isFinite(n) ? n : null;
}

function lasCondesPrice(events: any[]): { priceCents: number | null; priceText: string | null } {
  for (const ev of events) {
    const offer = asArray(ev?.offers)[0];
    const raw = offer?.price ?? offer?.lowPrice;
    const amount = parseClpAmount(raw);
    if (amount != null) {
      const currency = offer?.priceCurrency ?? 'CLP';
      return {
        priceCents: Math.round(amount * 100),
        priceText: `${new Intl.NumberFormat('es-CL').format(Math.round(amount))} ${currency}`,
      };
    }
  }
  return { priceCents: null, priceText: null };
}

function lasCondesEventStart(events: any[]): Date | null {
  const now = Date.now();
  const grace = 12 * 60 * 60 * 1000;
  for (const ev of events) {
    if (typeof ev?.startDate !== 'string') continue;
    const d = isoToInstant(ev.startDate);
    if (d && !isNaN(d.getTime()) && d.getTime() >= now - grace) return d;
  }
  return null;
}

function lasCondesTicketUrl(html: string): string | null {
  const urls = [...html.matchAll(/href=["']([^"']*(?:sertex|puntoticket)[^"']*)["']/gi)]
    .map((m) => decodeEntities(m[1]))
    .filter(Boolean);
  return urls[0] ?? null;
}

export const lasCondesScraper: TheaterScraper = {
  key: 'lascondes',
  async fetchShows(theater) {
    const base = theater.website.replace(/\/+$/, '');
    const listUrl = `${base}/estrenos/`;
    const res = await fetch(listUrl, {
      headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${listUrl}`);

    const cards = parseLasCondesCards(await res.text());
    const shows: ScrapedShow[] = [];

    await mapLimit(cards, 6, async (card) => {
      try {
        const detailRes = await fetch(card.url, {
          headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        });
        if (!detailRes.ok) return;
        const html = await detailRes.text();
        const events = lasCondesJsonLdEvents(html);
        const description = metaContent(html, 'og:description') ?? metaContent(html, 'description');
        const content = html.match(/<div id=["']content_principal["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? html;
        const startsAt =
          parseLasCondesDateText(htmlText(content), true) ??
          parseLasCondesDateText(card.dateText ?? '', false) ??
          lasCondesEventStart(events);
        const { priceCents, priceText } = lasCondesPrice(events);
        const sourceUrl = lasCondesTicketUrl(html) ?? card.url;
        const category = card.category ?? 'teatro';

        shows.push({
          externalId: card.url,
          title: card.title,
          description: description ? description.slice(0, 600) : null,
          startsAt,
          venue: 'Teatro Municipal de Las Condes',
          category,
          categories: normalizeEventCategories([category, card.title, description].filter(Boolean).join(' ')),
          priceText,
          priceCents,
          currency: 'CLP',
          sourceUrl,
          imageUrl: card.imageUrl ?? metaContent(html, 'og:image'),
        });
      } catch {
        // A single stale card or broken detail page should not fail the theater.
      }
    });

    return shows;
  },
};

// ---- Teatro UC (Facultad de Artes UC) --------------------------------------
// teatrouc.uc.cl runs The Events Calendar (Modern Tribe), which serves a clean
// REST feed at /wp-json/tribe/events/v1/events: every event carries an absolute
// utc_start_date plus title / venue / image / cost. So this adapter is a straight
// map over the paged feed — no per-show fetches, no JSON-LD, no date guessing
// (the UTC instant is authoritative). The seed URL teatrouc.cl 301s to the
// canonical teatrouc.uc.cl where the API lives, so the host is pinned here the
// same way gam.cl is in gamScraper.

const TEATROUC_API = 'https://teatrouc.uc.cl/wp-json/tribe/events/v1/events';

// The calendar also carries workshops, talks and auditions; drop the obvious
// non-performances by title keyword.
const TEATROUC_EXCLUDED_TITLE =
  /\b(taller|curso|conversatorio|laboratorio|audici[oó]n|convocatoria|seminario|charla|mesa\s+redonda)\b/i;

// The Events Calendar emits utc_* fields as UTC wall-clock with no zone marker
// ("2026-06-04 23:00:00"); tag those with Z. start_date / end_date are the venue's
// Santiago wall clock, read as such via the shared isoToInstant.
function tecInstant(value: unknown, utc: boolean): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return isoToInstant(value.trim().replace(' ', 'T') + (utc ? 'Z' : ''));
}

function tecCost(ev: any): { priceCents: number | null; priceText: string | null } {
  const values: any[] = Array.isArray(ev?.cost_details?.values) ? ev.cost_details.values : [];
  const nums = values
    .map((v) => parseFloat(String(v).replace(/[^\d.]/g, '')))
    .filter((n) => isFinite(n));
  if (nums.length) {
    // Cheapest tier; CLP * 100 keeps the cents convention (CLP has no minor unit).
    return { priceCents: Math.round(Math.min(...nums) * 100), priceText: ev.cost || null };
  }
  const cost = typeof ev?.cost === 'string' ? ev.cost.trim() : '';
  if (/liberad|gratis|gratuit|entrada\s+libre/i.test(cost)) return { priceCents: 0, priceText: cost };
  return { priceCents: null, priceText: cost || null };
}

export const teatroUcScraper: TheaterScraper = {
  key: 'teatrouc',
  async fetchShows() {
    const today = new Date().toISOString().slice(0, 10); // only upcoming events
    const shows: ScrapedShow[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const url = `${TEATROUC_API}?per_page=50&page=${page}&start_date=${today}`;
      let data: any;
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': 'AfishaBot/1.0 (+https://expresscarwash.cl)' },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) break; // TEC 400s past the last page
        data = await res.json();
      } catch {
        break;
      }
      totalPages = Number(data?.total_pages) || 1;
      for (const ev of Array.isArray(data?.events) ? data.events : []) {
        const eventUrl = typeof ev?.url === 'string' ? ev.url : null;
        const title = decodeEntities(String(ev?.title ?? '')).trim();
        if (!eventUrl || !title || TEATROUC_EXCLUDED_TITLE.test(title)) continue;
        const venueObj = ev?.venue;
        const venue =
          venueObj && typeof venueObj === 'object' && !Array.isArray(venueObj) && typeof venueObj.venue === 'string'
            ? decodeEntities(venueObj.venue)
            : null;
        const imageObj = ev?.image;
        const imageUrl =
          imageObj && typeof imageObj === 'object' && typeof imageObj.url === 'string' ? imageObj.url : null;
        const category =
          Array.isArray(ev?.categories) && ev.categories[0]?.name ? String(ev.categories[0].name) : 'teatro';
        const { priceCents, priceText } = tecCost(ev);
        shows.push({
          externalId: eventUrl,
          title,
          description: decodeEntities(String(ev?.excerpt ?? ev?.description ?? '')).slice(0, 600) || null,
          startsAt: tecInstant(ev?.utc_start_date, true) ?? tecInstant(ev?.start_date, false),
          endsAt: tecInstant(ev?.utc_end_date, true) ?? tecInstant(ev?.end_date, false),
          venue,
          category,
          priceText,
          priceCents,
          currency: 'CLP',
          sourceUrl: eventUrl,
          imageUrl,
        });
      }
      page++;
    } while (page <= totalPages);

    return shows;
  },
};

export const SCRAPERS: Record<string, TheaterScraper> = {
  municipal: municipalScraper,
  gam: gamScraper,
  lascondes: lasCondesScraper,
  teatrouc: teatroUcScraper,
  jsonld: genericJsonLdScraper,
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
 * Runs every active theater, upserting its shows. Venues without a bespoke
 * adapter fall back to the generic JSON-LD extractor, so all sources are
 * attempted. Each theater is isolated: a failure is recorded on the Theater
 * row and never aborts the others. Idempotent — re-running updates
 * `lastSeenAt` and details. Venues run in small parallel batches so ~200
 * sources finish in minutes instead of hours.
 */
const SCRAPE_CONCURRENCY = 8;

export async function runScrape(): Promise<ScrapeResult[]> {
  const theaters = await prisma.theater.findMany({
    where: { isActive: true },
  });

  const results: ScrapeResult[] = [];

  for (let i = 0; i < theaters.length; i += SCRAPE_CONCURRENCY) {
    const batch = theaters.slice(i, i + SCRAPE_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((theater) => scrapeOne(theater)));
    results.push(...batchResults);
  }

  return results;
}

async function scrapeOne(
  theater: Awaited<ReturnType<typeof prisma.theater.findMany>>[number]
): Promise<ScrapeResult> {
  const scraper = (theater.adapter && SCRAPERS[theater.adapter]) || genericJsonLdScraper;
  const now = new Date();

  {
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
            categories: s.categories ?? normalizeEventCategories(s.category),
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
            categories: s.categories ?? normalizeEventCategories(s.category),
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
      return { theater: theater.slug, ok: true, found: shows.length, upserted };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await prisma.theater.update({
        where: { id: theater.id },
        data: { lastScrapedAt: now, lastScrapeOk: false, lastError: error.slice(0, 500) },
      });
      return { theater: theater.slug, ok: false, found: 0, upserted: 0, error };
    }
  }
}
