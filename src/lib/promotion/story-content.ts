// Pure content logic for DondeGO event promo stories: which event to promote
// and the Spanish labels rendered onto the 1080×1920 image. Kept free of
// Prisma/next/og so it is unit-testable and shared by the image route
// (src/app/api/promotion/instagram/story-image) and the posting cron
// (src/lib/promotion/instagram-story).

const TZ = 'America/Santiago';

export const DEFAULT_STORY_LOOKAHEAD_DAYS = 21;

export type StoryEvent = {
  id: string;
  title: string;
  startsAt: Date;
  venue: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  description: string | null;
  isFree: boolean;
  // Cheapest active ticket in CLP (whole pesos), or null when unknown/free.
  minPriceClp: number | null;
};

// Greater Santiago match against the event's city/address (same intent as the
// scraper's geo-filter, scoped to fields the Event row carries).
export function isSantiagoEvent(event: Pick<StoryEvent, 'city' | 'address'>): boolean {
  return /santiago|regi[oó]n\s+metropolitana|providencia|las\s+condes|ñuñoa|nunoa|vitacura/i.test(
    `${event.city ?? ''} ${event.address ?? ''}`
  );
}

/**
 * The next event to promote. Upcoming Santiago events, soonest first; prefer
 * ones not yet posted (and within the lookahead window), then any unposted,
 * then — only if everything upcoming is already posted — null (nothing new to
 * post, so the caller skips rather than re-posting).
 */
export function pickStoryEvent(
  events: StoryEvent[],
  postedIds: Iterable<string>,
  options: { now?: Date; lookaheadDays?: number } = {}
): StoryEvent | null {
  const now = options.now ?? new Date();
  const lookaheadDays = options.lookaheadDays ?? DEFAULT_STORY_LOOKAHEAD_DAYS;
  const horizon = new Date(now.getTime() + lookaheadDays * 864e5);
  const posted = new Set(postedIds);

  const upcoming = events
    .filter((event) => isSantiagoEvent(event))
    .filter((event) => event.startsAt.getTime() > now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const unposted = upcoming.filter((event) => !posted.has(event.id));
  const withinWindow = unposted.filter((event) => event.startsAt.getTime() <= horizon.getTime());

  return withinWindow[0] ?? unposted[0] ?? null;
}

const CATEGORY_LABELS: Record<string, string> = {
  music: 'CONCIERTO',
  'performing-visual-arts': 'ESCENA',
  nightlife: 'FIESTA',
  business: 'NEGOCIOS',
  'food-drink': 'GASTRONOMÍA',
  hobbies: 'PANORAMA',
  lectures: 'CHARLA',
  holidays: 'FESTIVAL',
  concierto: 'CONCIERTO',
  'obra-de-teatro': 'TEATRO',
  festival: 'FESTIVAL',
  comedia: 'COMEDIA',
  exposicion: 'EXPOSICIÓN',
  charla: 'CHARLA',
  gastronomia: 'GASTRONOMÍA',
  deportes: 'DEPORTES',
  cine: 'CINE',
  familia: 'FAMILIA',
};

// The eyebrow badge: a couple of high-signal title cues win over the stored
// category (an opera is filed under "performing-visual-arts"), else the mapped
// category label, else a neutral fallback.
export function storyBadge(event: Pick<StoryEvent, 'title' | 'description' | 'category'>): string {
  const text = `${event.title} ${event.description ?? ''}`;
  if (/[óo]pera/i.test(text)) return 'ÓPERA';
  if (/sinf[óo]nic|orquesta|filarm[óo]nic/i.test(text)) return 'CONCIERTO';
  if (event.category && CATEGORY_LABELS[event.category]) return CATEGORY_LABELS[event.category];
  return 'PANORAMA';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type StoryLabels = {
  badge: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  venue: string | null;
  address: string | null;
};

export function storyLabels(event: StoryEvent): StoryLabels {
  const dateLabel = capitalize(
    new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: TZ,
    }).format(event.startsAt)
  );
  const timeLabel = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TZ,
  }).format(event.startsAt);

  const priceLabel =
    event.isFree || event.minPriceClp === 0
      ? 'Entrada gratuita'
      : event.minPriceClp != null
        ? `Entradas desde $${new Intl.NumberFormat('es-CL').format(event.minPriceClp)} CLP`
        : 'Entradas en dondego.cl';

  return {
    badge: storyBadge(event),
    dateLabel,
    timeLabel: `${timeLabel} hrs`,
    priceLabel,
    venue: event.venue,
    address: event.address,
  };
}
