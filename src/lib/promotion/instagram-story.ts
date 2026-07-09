import { prisma } from '@/lib/prisma';
import { clpListingAmount } from '@/lib/format';
import { getAppUrl } from '@/lib/payments/stripe';
import {
  DEFAULT_STORY_LOOKAHEAD_DAYS,
  pickStoryEvent,
  type StoryEvent,
} from '@/lib/promotion/story-content';
import {
  InstagramApiError,
  isInstagramConfigured,
  postInstagramStory,
  readInstagramConfig,
} from '@/lib/promotion/instagram';

// Orchestrates one automated Instagram Story post:
//   pick the next upcoming, not-yet-posted Santiago native event → build the
//   public story-image URL → publish via the Graph API → record the result.
// State lives in InstagramStoryPost so the cron never re-posts and rotates to
// the next event. Selecting/labelling logic is shared with the image route via
// src/lib/promotion/story-content.

export type StoryRunResult =
  | { status: 'skipped'; reason: 'not-configured' | 'no-upcoming-events' }
  | { status: 'dry-run'; event: StoryPreview; imageUrl: string }
  | { status: 'posted'; event: StoryPreview; imageUrl: string; mediaId: string }
  | { status: 'failed'; event: StoryPreview; imageUrl: string; error: string };

type StoryPreview = { id: string; title: string; startsAt: string };

function cheapestActiveClp(
  ticketTypes: { priceCents: number; currency: string; status: string }[]
): number | null {
  const clp = ticketTypes
    .filter((t) => (t.status === 'ACTIVE' || t.status === 'SOLD_OUT') && t.currency.toUpperCase() === 'CLP')
    .map((t) => t.priceCents)
    .filter((p) => Number.isFinite(p) && p > 0);
  // clpListingAmount handles both storage conventions (whole pesos vs pesos*100).
  return clp.length ? clpListingAmount(Math.min(...clp)) : null;
}

/** Loads published native events as StoryEvents for selection. */
export async function loadStoryEvents(now: Date): Promise<StoryEvent[]> {
  const rows = await prisma.event.findMany({
    where: {
      isPublished: true,
      status: 'PUBLISHED',
      startsAt: { gt: now },
    },
    select: STORY_EVENT_SELECT,
    orderBy: { startsAt: 'asc' },
    take: 200,
  });

  return rows.map(rowToStoryEvent);
}

const STORY_EVENT_SELECT = {
  id: true,
  title: true,
  startsAt: true,
  venue: true,
  address: true,
  city: true,
  category: true,
  description: true,
  isFree: true,
  ticketTypes: { select: { priceCents: true, currency: true, status: true } },
} as const;

function rowToStoryEvent(row: {
  id: string;
  title: string;
  startsAt: Date;
  venue: string;
  address: string;
  city: string;
  category: string;
  description: string;
  isFree: boolean;
  ticketTypes: { priceCents: number; currency: string; status: string }[];
}): StoryEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.startsAt,
    venue: row.venue,
    address: row.address,
    city: row.city,
    category: row.category,
    description: row.description,
    isFree: row.isFree,
    minPriceClp: row.isFree ? 0 : cheapestActiveClp(row.ticketTypes),
  };
}

/** Single published event as a StoryEvent, for the image route. */
export async function loadStoryEventById(id: string): Promise<StoryEvent | null> {
  const row = await prisma.event.findFirst({
    where: { id, isPublished: true, status: 'PUBLISHED' },
    select: STORY_EVENT_SELECT,
  });
  return row ? rowToStoryEvent(row) : null;
}

export function storyImageUrl(eventId: string): string {
  return `${getAppUrl().replace(/\/+$/, '')}/api/promotion/instagram/story-image/${eventId}`;
}

async function postedEventIds(): Promise<string[]> {
  const rows = await prisma.instagramStoryPost.findMany({
    where: { status: 'POSTED' },
    select: { eventId: true },
  });
  return rows.map((r) => r.eventId);
}

export type RunOptions = { dryRun?: boolean; now?: Date; lookaheadDays?: number };

export async function runInstagramStoryPost(options: RunOptions = {}): Promise<StoryRunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;

  if (!dryRun && !isInstagramConfigured()) {
    return { status: 'skipped', reason: 'not-configured' };
  }

  const [events, posted] = await Promise.all([loadStoryEvents(now), postedEventIds()]);
  const event = pickStoryEvent(events, posted, {
    now,
    lookaheadDays: options.lookaheadDays ?? DEFAULT_STORY_LOOKAHEAD_DAYS,
  });
  if (!event) return { status: 'skipped', reason: 'no-upcoming-events' };

  const preview: StoryPreview = { id: event.id, title: event.title, startsAt: event.startsAt.toISOString() };
  const imageUrl = storyImageUrl(event.id);

  if (dryRun) return { status: 'dry-run', event: preview, imageUrl };

  const config = readInstagramConfig();
  if (!config) return { status: 'skipped', reason: 'not-configured' };

  try {
    const { mediaId } = await postInstagramStory(imageUrl, config);
    await prisma.instagramStoryPost.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, mediaId, status: 'POSTED' },
      update: { mediaId, status: 'POSTED', error: null },
    });
    return { status: 'posted', event: preview, imageUrl, mediaId };
  } catch (error) {
    const message =
      error instanceof InstagramApiError
        ? `${error.message} (HTTP ${error.status})`
        : error instanceof Error
          ? error.message
          : String(error);
    // Record the failure but do NOT block this event forever: a FAILED row is
    // not POSTED, so the next run retries the same (still-nearest) event.
    await prisma.instagramStoryPost.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, status: 'FAILED', error: message.slice(0, 500) },
      update: { status: 'FAILED', error: message.slice(0, 500) },
    });
    return { status: 'failed', event: preview, imageUrl, error: message };
  }
}
