import type { ListedShow } from '@/lib/data/shows';
import { formatListingPrice } from '@/lib/format';
import { EVENT_CATEGORIES } from '@/lib/taxonomy';
import { santiagoDateKey, weekendWindow } from '@/lib/weekend';

// Shared mapping layer for the /api/v1 mobile endpoints. The web pages keep
// consuming ListedShow directly; mobile gets a stable wire shape with a
// `kind` discriminator ("native" organizer Event vs "scraped" Show) and
// prefixed ids ("event_<id>" / "show_<id>").

export type MobileEventSummary = {
  id: string;
  kind: 'native' | 'scraped';
  title: string;
  startsAt: string | null;
  venueName: string | null;
  imageUrl: string | null;
  categories: string[];
  // Scraped only: canonical external CTA. Native events have no sourceUrl —
  // the app opens the in-app detail screen instead of a browser.
  sourceUrl: string | null;
  priceText: string | null;
  priceMinor: number | null;
  minPriceMinor: number | null;
  currency: string;
};

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

/** Native organizer events enter ListedShow with an internal /events/ link. */
export function isNativeListedShow(show: Pick<ListedShow, 'sourceUrl'>): boolean {
  return show.sourceUrl?.startsWith('/events/') ?? false;
}

/** Strips the wire prefix; returns null when the id doesn't match the kind. */
export function unprefixedId(wireId: string, kind: 'native' | 'scraped'): string | null {
  const prefix = kind === 'native' ? 'event_' : 'show_';
  if (!wireId.startsWith(prefix)) return null;
  const raw = wireId.slice(prefix.length);
  return raw.length > 0 ? raw : null;
}

export function mobileEventSummary(show: ListedShow): MobileEventSummary {
  const native = isNativeListedShow(show);
  const priceText = show.priceText?.trim() || formatListingPrice(show.priceCents, show.currency);

  return {
    id: `${native ? 'event' : 'show'}_${show.id}`,
    kind: native ? 'native' : 'scraped',
    title: show.title,
    startsAt: show.startsAt?.toISOString() ?? null,
    venueName: show.venue ?? show.theater.name,
    imageUrl: show.imageUrl,
    categories: show.categories,
    sourceUrl: native ? null : show.sourceUrl,
    priceText: priceText || null,
    priceMinor: native ? null : show.priceCents,
    minPriceMinor: native ? show.priceCents : null,
    currency: show.currency,
  };
}

/**
 * Count-driven category strip (invariant: only non-empty categories, ordered
 * by count desc, taxonomy order as tie-breaker). Counted from the same list
 * the feed serves so chips and results never disagree.
 */
export function mobileCategoryCounts(shows: Pick<ListedShow, 'categories'>[]) {
  const counts = new Map<string, number>();
  for (const show of shows) {
    for (const category of show.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(([aSlug, aCount], [bSlug, bCount]) => {
      if (aCount !== bCount) return bCount - aCount;
      return (
        EVENT_CATEGORIES.indexOf(aSlug as (typeof EVENT_CATEGORIES)[number]) -
        EVENT_CATEGORIES.indexOf(bSlug as (typeof EVENT_CATEGORIES)[number])
      );
    })
    .map(([slug, count]) => ({ slug, count }));
}

export type MobileEventFilters = {
  category?: string | null;
  query?: string | null;
  /** YYYY-MM-DD in America/Santiago. */
  date?: string | null;
  weekend?: boolean;
  kind?: 'native' | 'scraped' | null;
};

export function filterListedShows(shows: ListedShow[], filters: MobileEventFilters): ListedShow[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const weekend = filters.weekend ? weekendWindow() : null;

  return shows.filter((show) => {
    if (filters.category && !show.categories.includes(filters.category)) return false;
    if (filters.kind) {
      const native = isNativeListedShow(show);
      if (filters.kind === 'native' && !native) return false;
      if (filters.kind === 'scraped' && native) return false;
    }
    if (filters.date || weekend) {
      if (!show.startsAt) return false;
      const key = santiagoDateKey(show.startsAt);
      if (filters.date && key !== filters.date) return false;
      if (weekend && (key < weekend.start || key > weekend.end)) return false;
    }
    if (query) {
      const haystack = [show.title, show.venue, show.theater.name, ...show.categories]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type Pagination = { page: number; pageSize: number };

/** Clamped `?page=&pageSize=` parsing shared by every v1 list endpoint. */
export function parsePagination(params: URLSearchParams): Pagination {
  const rawPage = Number.parseInt(params.get('page') ?? '', 10);
  const rawSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1 ? Math.min(rawSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

export function paginate<T>(items: T[], { page, pageSize }: Pagination): Paged<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    hasMore: start + pageSize < items.length,
  };
}
