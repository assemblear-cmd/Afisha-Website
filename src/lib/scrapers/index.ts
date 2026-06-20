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

export const SCRAPERS: Record<string, TheaterScraper> = {
  municipal: jsonLdAdapter('municipal', '/'),
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
