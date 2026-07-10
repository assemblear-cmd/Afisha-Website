import { prisma } from '@/lib/prisma';
import { Container, LinkButton } from '@/components/ui';
import { EventGrid } from '@/components/events/EventGrid';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { TopCategoryNav } from '@/components/home/TopCategoryNav';
import { WhereToGo } from '@/components/home/WhereToGo';
import { Mosaic } from '@/components/home/Mosaic';
import { WeekendFeature } from '@/components/home/WeekendFeature';
import { getCurrentUser } from '@/lib/auth';
import { getUpcomingShows, organizerEventCategories } from '@/lib/data/shows';
import {
  getUserPreferences,
  hasPreferences,
  prioritizeListedShows,
  type UserPreferences,
} from '@/lib/personalization';
import { getActivePromotedTiles } from '@/lib/promotion/homepage';

export const dynamic = 'force-dynamic';

/** Stable reorder of the native-events grid: preferred categories first. */
function prioritizeEvents<T extends { category: string; title: string }>(
  events: T[],
  prefs: UserPreferences | null
): T[] {
  if (!hasPreferences(prefs)) return events;
  return events
    .map((event, index) => ({
      event,
      index,
      score: organizerEventCategories(event).some((slug) =>
        prefs!.preferredCategories.includes(slug)
      )
        ? 1
        : 0,
    }))
    .sort((a, b) => (a.score !== b.score ? b.score - a.score : a.index - b.index))
    .map((entry) => entry.event);
}

export default async function HomePage() {
  const t = getDictionary(getLocale()).home;
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      status: 'PUBLISHED',
      startsAt: { gte: new Date() },
    },
    include: { ticketTypes: true },
    orderBy: { startsAt: 'asc' },
    take: 8,
  });
  const shows = await getUpcomingShows();
  // Signed-in visitors get their onboarding picks first: followed venues and
  // categories lead the mosaic and the upcoming grid, date order otherwise.
  const user = await getCurrentUser();
  const prefs = user ? await getUserPreferences(user.id) : null;
  const personalizedShows = prioritizeListedShows(shows, prefs);
  const personalizedEvents = prioritizeEvents(events, prefs);
  // Paid homepage tile placements (approved/live, window covering now).
  // Positions without one keep the normal mosaic content.
  const promoted = Array.from((await getActivePromotedTiles()).values());

  return (
    <main>
      <TopCategoryNav />
      <WhereToGo />
      <Mosaic
        items={personalizedShows}
        promoted={promoted}
        preferredCategories={prefs?.preferredCategories}
      />
      <WeekendFeature />

      {/* UPCOMING EVENTS */}
      <section className="py-12 bg-surface">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink">{t.upcomingEvents}</h2>
            <LinkButton href="/events" variant="ghost" size="sm">
              {t.seeAll} →
            </LinkButton>
          </div>
          <EventGrid events={personalizedEvents} />
        </Container>
      </section>
    </main>
  );
}
