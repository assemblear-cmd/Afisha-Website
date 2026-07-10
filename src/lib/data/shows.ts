import { prisma } from '@/lib/prisma';
import { EVENT_CATEGORIES, normalizeEventCategories, type EventCategory } from '@/lib/taxonomy';
import { dateKeyRange, weekendDateRange } from '@/lib/weekend';

const CALENDAR_LOOKAHEAD_DAYS = 31;

export type ListedShow = {
  id: string;
  title: string;
  startsAt: Date | null;
  venue: string | null;
  category: string;
  categories: string[];
  priceText: string | null;
  priceCents: number | null;
  currency: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  theater: {
    name: string;
    slug?: string | null;
    website: string | null;
    eventSources?: string[];
    city?: string;
    categories?: string[];
  };
};

const CINEMA_EVENT_RE =
  /\b(cine|cinema|film(?:e|es)?|pel[ií]culas?|documentales?|cortometrajes?|largometrajes?)\b|short\s+film|feature\s+film|film\s+festival|festival\s+(?:de\s+)?cine|muestra\s+(?:de\s+)?cine|ciclo\s+(?:de\s+)?cine|funci[oó]n\s+(?:de\s+)?cine|cartelera\s+(?:de\s+)?cine|premier(?:e)?\s+(?:de\s+)?(?:cine|pel[ií]cula|film)|estreno\s+(?:de\s+)?(?:cine|pel[ií]cula|film)/i;

const LEGACY_EVENT_CATEGORY_MAP: Record<string, EventCategory> = {
  music: 'concierto',
  nightlife: 'fiesta-y-vida-nocturna',
  'performing-visual-arts': 'obra-de-teatro',
  holidays: 'festival',
  lectures: 'charla',
  hobbies: 'evento-interactivo',
  business: 'negocios',
  'food-drink': 'gastronomia',
};

function categorySignalText(show: { title?: string | null; description?: string | null; category?: string | null }) {
  return [show.category, show.title].filter(Boolean).join(' ');
}

function hasCinemaSignal(show: { title?: string | null; description?: string | null; category?: string | null }) {
  return CINEMA_EVENT_RE.test(categorySignalText(show));
}

function uniqueEventCategories(categories: string[]): EventCategory[] {
  const unique: EventCategory[] = [];
  for (const category of categories) {
    if (isEventCategory(category) && !unique.includes(category)) unique.push(category);
  }
  return unique;
}

function finalEventCategories(
  show: { title?: string | null; description?: string | null; category?: string | null },
  candidates: string[]
): EventCategory[] {
  const cinema = hasCinemaSignal(show);
  const inferred = normalizeEventCategories(categorySignalText(show));
  const withoutBadCinema = uniqueEventCategories(candidates).filter((category) => category !== 'cine' || cinema);
  const categories = cinema
    ? uniqueEventCategories([
        'cine',
        ...withoutBadCinema.filter((category) => category !== 'obra-de-teatro'),
        ...inferred.filter((category) => category === 'cine' || category === 'festival'),
      ])
    : withoutBadCinema;

  return categories.length > 0 ? categories : ['otros'];
}

/**
 * Normalized taxonomy categories for a native organizer Event row (legacy
 * Eventbrite-style categories are mapped, free-text ones inferred). Exported
 * for preference-based reordering of native event lists.
 */
export function organizerEventCategories(event: {
  category: string;
  title?: string | null;
  description?: string | null;
}): EventCategory[] {
  return eventCategories(event);
}

function eventCategories(event: { category: string; title?: string | null; description?: string | null }): EventCategory[] {
  const category = event.category;
  const candidates = isEventCategory(category)
    ? [category]
    : LEGACY_EVENT_CATEGORY_MAP[category]
      ? [LEGACY_EVENT_CATEGORY_MAP[category]]
      : normalizeEventCategories(category);

  return finalEventCategories(event, candidates);
}

function showCategories(show: { title: string; description?: string | null; category: string | null; categories: string[] }): EventCategory[] {
  const candidates = show.categories.length > 0 ? show.categories : show.category ? normalizeEventCategories(show.category) : [];
  return finalEventCategories(show, candidates);
}

function scrapedShowToListedShow(
  show: Omit<ListedShow, 'category' | 'categories'> & {
    description?: string | null;
    category: string | null;
    categories: string[];
  }
): ListedShow {
  const { description: _description, ...listedShow } = show;
  const categories = showCategories(show);
  return {
    ...listedShow,
    category: categories[0] ?? 'otros',
    categories,
  };
}

function cheapestTicket(ticketTypes: { priceCents: number; currency: string }[]) {
  if (ticketTypes.length === 0) return { priceCents: null, currency: 'CLP' };
  const cheapest = [...ticketTypes].sort((a, b) => a.priceCents - b.priceCents)[0];
  return { priceCents: cheapest.priceCents, currency: cheapest.currency };
}

function organizerEventToListedShow(event: {
  id: string;
  title: string;
  startsAt: Date;
  venue: string;
  category: string;
  description: string;
  coverImage: string;
  ticketTypes: { priceCents: number; currency: string }[];
}): ListedShow {
  const categories = eventCategories(event);
  const price = cheapestTicket(event.ticketTypes);

  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    venue: event.venue,
    category: categories[0],
    categories,
    priceText: null,
    priceCents: price.priceCents,
    currency: price.currency,
    sourceUrl: `/events/${event.id}`,
    imageUrl: event.coverImage,
    theater: {
      name: event.venue,
      slug: null,
      website: null,
      eventSources: [],
      city: 'Santiago',
      categories: [],
    },
  };
}

function sortListedShows(a: ListedShow, b: ListedShow) {
  const aTime = a.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.title.localeCompare(b.title);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getPublishedOrganizerEvents(options: {
  startsAtGte: Date;
  startsAtLt?: Date;
  category?: EventCategory;
  take: number;
}) {
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      isPublished: true,
      city: { contains: 'Santiago' },
      startsAt: {
        gte: options.startsAtGte,
        ...(options.startsAtLt ? { lt: options.startsAtLt } : {}),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      venue: true,
      category: true,
      coverImage: true,
      ticketTypes: {
        where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
        select: { priceCents: true, currency: true },
      },
    },
    orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
    take: options.take,
  });

  const listed = events.map(organizerEventToListedShow);
  return options.category
    ? listed.filter((event) => event.categories.includes(options.category!))
    : listed;
}

// Eventbrite-style flat feed: upcoming Santiago theater shows from the scraped
// aggregator, date-sorted. Shows with no known date sort first (TBA).
export async function getUpcomingShows() {
  const now = new Date();

  const [shows, organizerEvents] = await Promise.all([
    prisma.show.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { gte: now } },
          { endsAt: { gte: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        venue: true,
        category: true,
        categories: true,
        priceText: true,
        priceCents: true,
        currency: true,
        sourceUrl: true,
        imageUrl: true,
        theater: {
          select: {
            name: true,
            slug: true,
            website: true,
            eventSources: true,
            city: true,
            categories: true,
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 200,
    }),
    getPublishedOrganizerEvents({ startsAtGte: now, take: 200 }),
  ]);

  return [...shows.map(scrapedShowToListedShow), ...organizerEvents].sort(sortListedShows).slice(0, 200);
}

export function isEventCategory(value: string | undefined | null): value is EventCategory {
  return !!value && (EVENT_CATEGORIES as readonly string[]).includes(value);
}

function categoryWhere(category?: EventCategory) {
  return category && category !== 'cine' ? { categories: { has: category } } : {};
}

function filterListedShows<T extends ListedShow>(shows: T[], category?: EventCategory): T[] {
  return category ? shows.filter((show) => show.categories.includes(category)) : shows;
}

export async function getCalendarShows(category?: EventCategory) {
  const now = new Date();
  const horizon = addDays(now, CALENDAR_LOOKAHEAD_DAYS);

  const [shows, organizerEvents] = await Promise.all([
    prisma.show.findMany({
      where: {
        isActive: true,
        startsAt: { gte: now, lt: horizon },
        ...categoryWhere(category),
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        venue: true,
        category: true,
        categories: true,
        priceText: true,
        priceCents: true,
        currency: true,
        sourceUrl: true,
        imageUrl: true,
        theater: {
          select: {
            name: true,
            slug: true,
            website: true,
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      take: 300,
    }),
    getPublishedOrganizerEvents({ startsAtGte: now, startsAtLt: horizon, category, take: 300 }),
  ]);

  return filterListedShows([...shows.map(scrapedShowToListedShow), ...organizerEvents].sort(sortListedShows), category).slice(0, 300);
}

export type CalendarShow = ListedShow;

export async function getWeekendShows(category?: EventCategory) {
  const now = new Date();
  const weekend = weekendDateRange();

  const [shows, organizerEvents] = await Promise.all([
    prisma.show.findMany({
      where: {
        isActive: true,
        startsAt: {
          gte: weekend.start > now ? weekend.start : now,
          lt: weekend.endExclusive,
        },
        ...categoryWhere(category),
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        venue: true,
        category: true,
        categories: true,
        priceText: true,
        priceCents: true,
        currency: true,
        sourceUrl: true,
        imageUrl: true,
        theater: {
          select: {
            name: true,
            slug: true,
            website: true,
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      take: 120,
    }),
    getPublishedOrganizerEvents({
      startsAtGte: weekend.start > now ? weekend.start : now,
      startsAtLt: weekend.endExclusive,
      category,
      take: 120,
    }),
  ]);

  return filterListedShows([...shows.map(scrapedShowToListedShow), ...organizerEvents].sort(sortListedShows), category).slice(0, 120);
}

export type WeekendShow = ListedShow;

export async function getShowsForDate(dateKey: string, category?: EventCategory) {
  const range = dateKeyRange(dateKey);

  const [shows, organizerEvents] = await Promise.all([
    prisma.show.findMany({
      where: {
        isActive: true,
        startsAt: {
          gte: range.start,
          lt: range.endExclusive,
        },
        ...categoryWhere(category),
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        venue: true,
        category: true,
        categories: true,
        priceText: true,
        priceCents: true,
        currency: true,
        sourceUrl: true,
        imageUrl: true,
        theater: {
          select: {
            name: true,
            slug: true,
            website: true,
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      take: 160,
    }),
    getPublishedOrganizerEvents({
      startsAtGte: range.start,
      startsAtLt: range.endExclusive,
      category,
      take: 160,
    }),
  ]);

  return filterListedShows([...shows.map(scrapedShowToListedShow), ...organizerEvents].sort(sortListedShows), category).slice(0, 160);
}

export type DateShow = ListedShow;

// Theater-first view for the /teatros page: every active theater, each with its
// own upcoming shows (date-sorted). Theaters with no shows yet are still
// returned so the page can list them with a "coming soon" placeholder.
export async function getTheatersWithShows() {
  const now = new Date();

  return prisma.theater.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      eventSources: true,
      city: true,
      categories: true,
      shows: {
        where: {
          isActive: true,
          OR: [
            { startsAt: null, endsAt: null },
            { startsAt: { gte: now } },
            { endsAt: { gte: now } },
          ],
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          venue: true,
          category: true,
          categories: true,
          priceText: true,
          priceCents: true,
          currency: true,
          sourceUrl: true,
          imageUrl: true,
        },
        orderBy: [{ startsAt: 'asc' }],
        take: 50,
      },
    },
    orderBy: [{ name: 'asc' }],
  });
}

export type TheaterWithShows = Awaited<ReturnType<typeof getTheatersWithShows>>[number];
