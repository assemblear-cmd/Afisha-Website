import { prisma } from '@/lib/prisma';
import { Container, LinkButton } from '@/components/ui';
import { EventGrid } from '@/components/events/EventGrid';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { TopCategoryNav } from '@/components/home/TopCategoryNav';
import { WhereToGo } from '@/components/home/WhereToGo';
import { Mosaic } from '@/components/home/Mosaic';
import { WeekendFeature } from '@/components/home/WeekendFeature';
import { getUpcomingShows } from '@/lib/data/shows';
import { getActivePromotedTiles } from '@/lib/promotion/homepage';

export const dynamic = 'force-dynamic';

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
  // Paid homepage tile placements (approved/live, window covering now).
  // Positions without one keep the normal mosaic content.
  const promoted = Array.from((await getActivePromotedTiles()).values());

  return (
    <main>
      <TopCategoryNav />
      <WhereToGo />
      <Mosaic items={shows} promoted={promoted} />
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
          <EventGrid events={events} />
        </Container>
      </section>
    </main>
  );
}
