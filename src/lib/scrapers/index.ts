import { prisma } from '@/lib/prisma';
import { normalizeEventCategories } from '@/lib/taxonomy';
import {
  type ScrapedShow,
  type TheaterScraper,
  asArray,
  decodeEntities,
  extractJsonLdEvents,
  extractJsonLdEventsFromHtml,
  isoToInstant,
  mapLimit,
  santiagoTime,
  stripTags,
} from './shared';
import { PLATFORM_ADAPTER_KEYS, PLATFORM_SCRAPERS } from './platforms';

// Generic building blocks (JSON-LD extraction, Santiago-safe date parsing,
// HTML helpers) live in ./shared; cross-city platform adapters (Eventbrite,
// Fever, viagogo, StubHub) in ./platforms. This module keeps the per-venue
// adapters and the orchestrator.

export type { ScrapedShow, TheaterScraper } from './shared';
export { extractJsonLdEvents } from './shared';

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
  ...PLATFORM_SCRAPERS,
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
 * Which sources a scrape run covers. Venue sites are scanned daily; the
 * cross-city platforms (Eventbrite, Fever, viagogo, StubHub) weekly — they
 * change slower and are far more sensitive to crawl frequency.
 */
export type ScrapeGroup = 'venues' | 'platforms' | 'all';

function inScrapeGroup(theater: { adapter: string | null }, group: ScrapeGroup): boolean {
  const isPlatform = !!theater.adapter && PLATFORM_ADAPTER_KEYS.has(theater.adapter);
  if (group === 'all') return true;
  return group === 'platforms' ? isPlatform : !isPlatform;
}

/**
 * Runs every active theater in the group, upserting its shows. Venues without
 * a bespoke adapter fall back to the generic JSON-LD extractor, so all sources
 * are attempted. Each theater is isolated: a failure is recorded on the
 * Theater row and never aborts the others. Idempotent — re-running updates
 * `lastSeenAt` and details. Venues run in small parallel batches so ~200
 * sources finish in minutes instead of hours.
 */
const SCRAPE_CONCURRENCY = 8;

export async function runScrape(group: ScrapeGroup = 'venues'): Promise<ScrapeResult[]> {
  const theaters = (
    await prisma.theater.findMany({
      where: { isActive: true },
    })
  ).filter((theater) => inScrapeGroup(theater, group));

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
