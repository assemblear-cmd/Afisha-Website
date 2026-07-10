import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { getCurrentUser } from '@/lib/auth';
import { getUpcomingShows } from '@/lib/data/shows';
import {
  filterListedShows,
  mobileEventSummary,
  paginate,
  parsePagination,
} from '@/lib/mobile/events';
import { getUserPreferences, prioritizeListedShows } from '@/lib/personalization';
import { EVENT_CATEGORIES } from '@/lib/taxonomy';
import { isDateKey } from '@/lib/weekend';

// Unified, paginated event list (scraped Shows + published native Events).
// Filters: category (taxonomy slug), query (text), date (YYYY-MM-DD in
// America/Santiago), weekend=true, kind=native|scraped. Signed-in users get
// preference-first ordering (followed venues/categories before the rest).

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const category = params.get('category');
    if (category && !(EVENT_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: 'Unknown category.' }, { status: 400 });
    }

    const date = params.get('date');
    if (date && !isDateKey(date)) {
      return NextResponse.json({ error: 'Invalid date. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const kindParam = params.get('kind');
    if (kindParam && kindParam !== 'native' && kindParam !== 'scraped') {
      return NextResponse.json({ error: 'kind must be native or scraped.' }, { status: 400 });
    }

    const [shows, user] = await Promise.all([getUpcomingShows(), getCurrentUser()]);
    const prefs = user ? await getUserPreferences(user.id) : null;
    const filtered = filterListedShows(prioritizeListedShows(shows, prefs), {
      category,
      query: params.get('query'),
      date,
      weekend: params.get('weekend') === 'true',
      kind: kindParam as 'native' | 'scraped' | null,
    });

    return NextResponse.json(paginate(filtered.map(mobileEventSummary), parsePagination(params)));
  } catch (error) {
    return errorHandler(error);
  }
}
