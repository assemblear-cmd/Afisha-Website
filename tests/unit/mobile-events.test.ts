import { describe, expect, it } from 'vitest';
import type { ListedShow } from '@/lib/data/shows';
import { bearerToken } from '@/lib/auth';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  filterListedShows,
  mobileCategoryCounts,
  mobileEventSummary,
  paginate,
  parsePagination,
  unprefixedId,
} from '@/lib/mobile/events';
import { ticketQrPayload } from '@/lib/tickets/tokens';

function listedShow(overrides: Partial<ListedShow> = {}): ListedShow {
  return {
    id: 'show-1',
    wireId: 'show_show-1',
    title: 'Concierto Sinfónico',
    startsAt: new Date('2026-08-01T20:00:00Z'),
    venue: 'Sala Principal',
    category: 'concierto',
    categories: ['concierto'],
    priceText: '$12.000',
    priceCents: 12000,
    currency: 'CLP',
    sourceUrl: 'https://example.com/evento',
    imageUrl: 'https://example.com/img.jpg',
    theater: { name: 'Teatro Municipal', slug: 'municipal', website: 'https://example.com' },
    ...overrides,
  };
}

function nativeListedShow(overrides: Partial<ListedShow> = {}): ListedShow {
  return listedShow({
    id: 'event-1',
    wireId: 'event_event-1',
    sourceUrl: '/events/event-1',
    priceText: null,
    ...overrides,
  });
}

describe('mobileEventSummary', () => {
  it('maps scraped shows with prefixed id, kind, and external sourceUrl', () => {
    const summary = mobileEventSummary(listedShow());
    expect(summary.id).toBe('show_show-1');
    expect(summary.kind).toBe('scraped');
    expect(summary.sourceUrl).toBe('https://example.com/evento');
    expect(summary.priceMinor).toBe(12000);
    expect(summary.minPriceMinor).toBeNull();
  });

  it('maps native events with event_ prefix and NO sourceUrl (in-app detail)', () => {
    const summary = mobileEventSummary(nativeListedShow());
    expect(summary.id).toBe('event_event-1');
    expect(summary.kind).toBe('native');
    expect(summary.sourceUrl).toBeNull();
    expect(summary.minPriceMinor).toBe(12000);
    expect(summary.priceMinor).toBeNull();
  });

  it('serializes TBA dates as null', () => {
    expect(mobileEventSummary(listedShow({ startsAt: null })).startsAt).toBeNull();
  });
});

describe('unprefixedId', () => {
  it('strips matching prefixes and rejects mismatches', () => {
    expect(unprefixedId('event_abc', 'native')).toBe('abc');
    expect(unprefixedId('show_abc', 'scraped')).toBe('abc');
    expect(unprefixedId('show_abc', 'native')).toBeNull();
    expect(unprefixedId('event_', 'native')).toBeNull();
  });
});

describe('mobileCategoryCounts', () => {
  it('orders by count desc with taxonomy order as tie-breaker and skips empties', () => {
    const shows = [
      listedShow({ categories: ['obra-de-teatro'] }),
      listedShow({ categories: ['obra-de-teatro'] }),
      // festival and exposicion tie at 1 — festival comes first in taxonomy.
      listedShow({ categories: ['exposicion'] }),
      listedShow({ categories: ['festival'] }),
    ];
    const counts = mobileCategoryCounts(shows);
    expect(counts.map((c) => c.slug)).toEqual(['obra-de-teatro', 'festival', 'exposicion']);
    expect(counts[0]?.count).toBe(2);
    expect(counts.every((c) => c.count > 0)).toBe(true);
  });
});

describe('filterListedShows', () => {
  const shows = [
    listedShow({ id: 'a', categories: ['concierto'] }),
    nativeListedShow({ id: 'b', categories: ['festival'] }),
    listedShow({ id: 'c', categories: ['concierto'], title: 'Jazz nocturno' }),
  ];

  it('filters by category', () => {
    expect(filterListedShows(shows, { category: 'festival' }).map((s) => s.id)).toEqual(['b']);
  });

  it('filters by kind', () => {
    expect(filterListedShows(shows, { kind: 'native' }).map((s) => s.id)).toEqual(['b']);
    expect(filterListedShows(shows, { kind: 'scraped' }).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('filters by free-text query across title/venue/theater', () => {
    expect(filterListedShows(shows, { query: 'jazz' }).map((s) => s.id)).toEqual(['c']);
    expect(filterListedShows(shows, { query: 'municipal' })).toHaveLength(3);
  });

  it('date filter drops TBA shows', () => {
    const withTba = [...shows, listedShow({ id: 'tba', startsAt: null })];
    const filtered = filterListedShows(withTba, { date: '2026-08-01' });
    expect(filtered.every((s) => s.startsAt !== null)).toBe(true);
  });
});

describe('parsePagination / paginate', () => {
  it('defaults and clamps', () => {
    expect(parsePagination(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    expect(parsePagination(new URLSearchParams('page=-2&pageSize=9999'))).toEqual({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
    expect(parsePagination(new URLSearchParams('page=3&pageSize=10'))).toEqual({
      page: 3,
      pageSize: 10,
    });
  });

  it('computes hasMore and slices stable pages', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    const page2 = paginate(items, { page: 2, pageSize: 20 });
    expect(page2.items[0]).toBe(20);
    expect(page2.total).toBe(45);
    expect(page2.hasMore).toBe(true);
    expect(paginate(items, { page: 3, pageSize: 20 }).hasMore).toBe(false);
  });
});

describe('bearerToken', () => {
  it('parses valid Bearer headers case-insensitively', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerToken('bearer token123')).toBe('token123');
    expect(bearerToken('  Bearer   spaced  ')).toBe('spaced');
  });

  it('rejects missing/malformed headers', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken('')).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken('Bearer')).toBeNull();
  });
});

describe('ticketQrPayload', () => {
  it('exposes the QR payload only for scannable statuses', () => {
    expect(ticketQrPayload('ISSUED', 'tok')).toBe('DGO1.tok');
    expect(ticketQrPayload('CHECKED_IN', 'tok')).toBe('DGO1.tok');
    for (const status of ['CANCELLED', 'REFUNDED', 'EXPIRED', 'INVALIDATED']) {
      expect(ticketQrPayload(status, 'tok')).toBeNull();
    }
  });
});
