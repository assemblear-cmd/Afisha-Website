import { prisma } from '@/lib/prisma';

export type PromotedTile = {
  position: number;
  eventId: string;
  title: string;
  coverImage: string;
  venue: string;
};

/**
 * Approved/live paid placements whose window covers "now", keyed by tile
 * position (1..7). The homepage mosaic overlays these on its grid; positions
 * without an active placement keep their normal aggregator content. The event
 * must still be published — an unpublished event never advertises.
 */
export async function getActivePromotedTiles(): Promise<Map<number, PromotedTile>> {
  const now = new Date();
  const placements = await prisma.homepageTilePlacement.findMany({
    where: {
      status: { in: ['APPROVED', 'LIVE'] },
      startAt: { lte: now },
      endAt: { gt: now },
      event: { status: 'PUBLISHED', isPublished: true },
    },
    include: {
      tile: { select: { position: true } },
      event: { select: { id: true, title: true, coverImage: true, venue: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const byPosition = new Map<number, PromotedTile>();
  for (const placement of placements) {
    if (byPosition.has(placement.tile.position)) continue;
    byPosition.set(placement.tile.position, {
      position: placement.tile.position,
      eventId: placement.event.id,
      title: placement.event.title,
      coverImage: placement.event.coverImage,
      venue: placement.event.venue,
    });
  }
  return byPosition;
}
