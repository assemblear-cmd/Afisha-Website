import { NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { getUpcomingShows } from '@/lib/data/shows';
import {
  DEFAULT_PAGE_SIZE,
  mobileCategoryCounts,
  mobileEventSummary,
  paginate,
} from '@/lib/mobile/events';
import { weekendWindow } from '@/lib/weekend';

const HERO_SIZE = 7;

// Home screen in one round-trip: count-driven categories, hero rail, first
// page of upcoming events, and the weekend window. Deeper browsing uses
// /api/v1/events with filters + pagination.

export async function GET() {
  try {
    const shows = await getUpcomingShows();
    const weekend = weekendWindow();
    const upcoming = paginate(shows.map(mobileEventSummary), {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });

    return NextResponse.json({
      categories: mobileCategoryCounts(shows),
      hero: shows.slice(0, HERO_SIZE).map((show) => ({
        ...mobileEventSummary(show),
        promoted: false,
      })),
      upcoming,
      weekend: { from: weekend.start, to: weekend.end },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
