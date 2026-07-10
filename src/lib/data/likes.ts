import { prisma } from '@/lib/prisma';
import type { ListedShow } from '@/lib/data/shows';

// Mobile wire-id for a listed show: native organizer events carry an internal
// `/events/<id>` sourceUrl, scraped shows do not. The like API keys off the
// same `event_<id>` / `show_<id>` scheme, so both surfaces stay in sync.
export function listedShowWireId(show: Pick<ListedShow, 'id' | 'sourceUrl'>): string {
  return show.sourceUrl?.startsWith('/events/') ? `event_${show.id}` : `show_${show.id}`;
}

/** The set of wire-ids the user has liked, for marking hearts on server render. */
export async function getLikedKeys(userId: string): Promise<Set<string>> {
  const likes = await prisma.eventLike.findMany({
    where: { userId },
    select: { targetKey: true },
  });
  return new Set(likes.map((like) => like.targetKey));
}
