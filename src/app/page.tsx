import { prisma } from '@/lib/prisma';
import { Container, LinkButton } from '@/components/ui';
import { SearchBar } from '@/components/events/SearchBar';
import { EventGrid } from '@/components/events/EventGrid';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { TopCategoryNav } from '@/components/home/TopCategoryNav';
import { WhereToGo } from '@/components/home/WhereToGo';
import { Mosaic } from '@/components/home/Mosaic';
import { WeekendFeature } from '@/components/home/WeekendFeature';
import { getUpcomingShows } from '@/lib/data/shows';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const t = getDictionary(getLocale()).home;
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      startsAt: { gte: new Date() },
    },
    include: { ticketTypes: true },
    orderBy: { startsAt: 'asc' },
    take: 8,
  });
  const shows = await getUpcomingShows();

  return (
    <main>
      <TopCategoryNav />
      <WhereToGo />
      <Mosaic items={shows} />
      <WeekendFeature />

      {/* MOBILE SEARCH — the header search is desktop-only */}
      <section className="mt-6 lg:hidden">
        <Container>
          <SearchBar />
        </Container>
      </section>

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
