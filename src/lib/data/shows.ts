import { prisma } from '@/lib/prisma';

// Eventbrite-style flat feed: upcoming Santiago theater shows from the scraped
// aggregator, date-sorted. Shows with no known date sort first (TBA).
export async function getUpcomingShows() {
  return prisma.show.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { gte: new Date() } }],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: true,
      category: true,
      priceCents: true,
      currency: true,
      sourceUrl: true,
      imageUrl: true,
      theater: { select: { name: true, slug: true, website: true, city: true } },
    },
    orderBy: [{ startsAt: 'asc' }],
    take: 200,
  });
}

export type ListedShow = Awaited<ReturnType<typeof getUpcomingShows>>[number];
