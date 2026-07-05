import { NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { getUpcomingShows } from '@/lib/data/shows';
import { mobileCategoryCounts } from '@/lib/mobile/events';

// Count-driven category strip: only non-empty categories, ordered by count
// desc with taxonomy order as tie-breaker. Clients render the server order
// unchanged (product invariant).

export async function GET() {
  try {
    const shows = await getUpcomingShows();
    return NextResponse.json({ categories: mobileCategoryCounts(shows) });
  } catch (error) {
    return errorHandler(error);
  }
}
