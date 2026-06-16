import { prisma } from '@/lib/prisma';
import { Container, LinkButton } from '@/components/ui';
import { SearchBar } from '@/components/events/SearchBar';
import { CategoryFilter } from '@/components/events/CategoryFilter';
import { EventGrid } from '@/components/events/EventGrid';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      startsAt: { gte: new Date() },
    },
    include: { ticketTypes: true },
    orderBy: { startsAt: 'asc' },
    take: 8,
  });

  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-br from-ink to-[#3a1d63] text-white py-16 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
              Find your next experience
            </h1>
            <p className="mt-4 text-white/70 text-lg sm:text-xl">
              Browse thousands of events — concerts, workshops, food festivals and more.
            </p>
          </div>

          {/* Search bar — slightly overlapping next section via negative margin */}
          <div className="mt-8 max-w-4xl">
            <SearchBar />
          </div>
        </Container>
      </section>

      {/* CATEGORY ROW */}
      <section className="py-10 border-b border-ink/5">
        <Container>
          <h2 className="text-lg font-semibold text-ink mb-4">Browse by category</h2>
          <CategoryFilter />
        </Container>
      </section>

      {/* FEATURED EVENTS */}
      <section className="py-12 bg-surface">
        <Container>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-ink">Upcoming events</h2>
            <LinkButton href="/events" variant="ghost" size="sm">
              See all →
            </LinkButton>
          </div>
          <EventGrid events={events} />
        </Container>
      </section>
    </main>
  );
}
