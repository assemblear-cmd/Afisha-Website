import { NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { getCurrentUser } from '@/lib/auth';
import { getUpcomingShows } from '@/lib/data/shows';
import {
  DEFAULT_PAGE_SIZE,
  mobileCategoryCounts,
  mobileEventSummary,
  paginate,
} from '@/lib/mobile/events';
import { getUserPreferences, prioritizeListedShows } from '@/lib/personalization';
import { weekendWindow } from '@/lib/weekend';

const HERO_SIZE = 7;

// Home screen in one round-trip: count-driven categories, hero rail, first
// page of upcoming events, and the weekend window. Deeper browsing uses
// /api/v1/events with filters + pagination. Signed-in users (Bearer token)
// get preference-first ordering: followed venues and categories come first,
// date order kept within each bucket.

export async function GET() {
  try {
    const [shows, user] = await Promise.all([getUpcomingShows(), getCurrentUser()]);
    const prefs = user ? await getUserPreferences(user.id) : null;
    const ordered = prioritizeListedShows(shows, prefs);
    const weekend = weekendWindow();
    const upcoming = paginate(ordered.map(mobileEventSummary), {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });

    return NextResponse.json({
      categories: mobileCategoryCounts(shows),
      hero: ordered.slice(0, HERO_SIZE).map((show) => ({
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
