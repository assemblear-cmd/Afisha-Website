import { prisma } from '@/lib/prisma';

// Web-side helpers around the EventLike table. Like targets use the mobile
// wire-id form ("event_<id>" native organizer event | "show_<id>" scraped
// show) so web and Android share one likes store.

export function nativeLikeKey(eventId: string): string {
  return `event_${eventId}`;
}

export function scrapedLikeKey(showId: string): string {
  return `show_${showId}`;
}

/** Every like key of a user, for marking hearts on server-rendered lists. */
export async function getLikedKeys(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const likes = await prisma.eventLike.findMany({
    where: { userId },
    select: { targetKey: true },
  });
  return new Set(likes.map((like) => like.targetKey));
}

export type SavedLikeItem = {
  key: string;
  kind: 'native' | 'scraped';
  title: string;
  startsAt: Date | null;
  venueName: string | null;
  /** Internal path for native events, external source URL for scraped shows. */
  href: string | null;
  imageUrl: string | null;
};

/**
 * The user's liked items resolved to displayable rows (newest like first).
 * Likes whose target has since been deleted are silently skipped.
 */
export async function getSavedItems(userId: string): Promise<SavedLikeItem[]> {
  const likes = await prisma.eventLike.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { targetKey: true },
  });

  const eventIds: string[] = [];
  const showIds: string[] = [];
  for (const { targetKey } of likes) {
    if (targetKey.startsWith('event_')) eventIds.push(targetKey.slice('event_'.length));
    else if (targetKey.startsWith('show_')) showIds.push(targetKey.slice('show_'.length));
  }

  const [events, shows] = await Promise.all([
    eventIds.length
      ? prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, startsAt: true, venue: true, coverImage: true },
        })
      : Promise.resolve([]),
    showIds.length
      ? prisma.show.findMany({
          where: { id: { in: showIds } },
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: true,
            sourceUrl: true,
            imageUrl: true,
            theater: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const eventById = new Map(events.map((event) => [event.id, event]));
  const showById = new Map(shows.map((show) => [show.id, show]));

  const items: SavedLikeItem[] = [];
  for (const { targetKey } of likes) {
    if (targetKey.startsWith('event_')) {
      const event = eventById.get(targetKey.slice('event_'.length));
      if (!event) continue;
      items.push({
        key: targetKey,
        kind: 'native',
        title: event.title,
        startsAt: event.startsAt,
        venueName: event.venue,
        href: `/events/${event.id}`,
        imageUrl: event.coverImage || null,
      });
    } else if (targetKey.startsWith('show_')) {
      const show = showById.get(targetKey.slice('show_'.length));
      if (!show) continue;
      items.push({
        key: targetKey,
        kind: 'scraped',
        title: show.title,
        startsAt: show.startsAt,
        venueName: show.venue ?? show.theater.name,
        href: show.sourceUrl,
        imageUrl: show.imageUrl,
      });
    }
  }

  return items;
}
