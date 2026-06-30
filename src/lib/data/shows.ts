import { prisma } from '@/lib/prisma';

// Eventbrite-style flat feed: upcoming Santiago theater shows from the scraped
// aggregator, date-sorted. Shows with no known date sort first (TBA).
export async function getUpcomingShows() {
  const now = new Date();

  return prisma.show.findMany({
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
  });
}

export type ListedShow = Awaited<ReturnType<typeof getUpcomingShows>>[number];

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
