import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { getUpcomingShows } from '@/lib/data/shows';
import { mobileCategoryCounts } from '@/lib/mobile/events';

// Options for the two registration onboarding questions:
//   1. Which event categories interest you?  -> `categories`
//   2. Which venues do you want to follow?   -> `venues`
// Categories are count-ordered from the live feed (same source as the
// category strip). Venues are active theaters ordered by upcoming activity;
// aggregator platforms (ticketing sites etc.) are excluded — only real places
// people can follow.

const NON_VENUE_CATEGORIES = new Set(['ticketera', 'plataforma-cultural', 'productora']);
const MAX_VENUES = 30;

export async function GET() {
  try {
    const [shows, theaters] = await Promise.all([
      getUpcomingShows(),
      prisma.theater.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          name: true,
          city: true,
          categories: true,
          _count: {
            select: {
              shows: { where: { isActive: true, startsAt: { gte: new Date() } } },
            },
          },
        },
      }),
    ]);

    const venues = theaters
      .filter((theater) => !theater.categories.some((slug) => NON_VENUE_CATEGORIES.has(slug)))
      .sort((a, b) => {
        if (a._count.shows !== b._count.shows) return b._count.shows - a._count.shows;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_VENUES)
      .map((theater) => ({
        slug: theater.slug,
        name: theater.name,
        city: theater.city,
        categories: theater.categories,
        upcomingCount: theater._count.shows,
      }));

    return NextResponse.json({
      categories: mobileCategoryCounts(shows),
      venues,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
