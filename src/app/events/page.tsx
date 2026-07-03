import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Container } from '@/components/ui';
import { SearchBar } from '@/components/events/SearchBar';
import { CategoryFilter } from '@/components/events/CategoryFilter';
import { EventGrid } from '@/components/events/EventGrid';
import { categoryLabel } from '@/lib/categories';
import { weekendDateRange } from '@/lib/weekend';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Browse events' };

interface EventsPageProps {
  searchParams: {
    query?: string;
    city?: string;
    category?: string;
    date?: string;
    period?: string;
  };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { query, city, category, date, period } = searchParams;

  const now = new Date();

  // Build the startsAt gte boundary
  let startsAtGte = now;
  let startsAtLt: Date | undefined;
  if (period === 'weekend') {
    const weekend = weekendDateRange();
    startsAtGte = weekend.start > now ? weekend.start : now;
    startsAtLt = weekend.endExclusive;
  }
  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      startsAtGte = parsed;
      startsAtLt = undefined;
    }
  }

  const where: Prisma.EventWhereInput = {
    isPublished: true,
    status: 'PUBLISHED',
    startsAt: { gte: startsAtGte, ...(startsAtLt ? { lt: startsAtLt } : {}) },
    ...(category ? { category } : {}),
    city: { contains: city ?? 'Santiago' },
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { venue: { contains: query } },
            { city: { contains: query } },
          ],
        }
      : {}),
  };

  const events = await prisma.event.findMany({
    where,
    include: { ticketTypes: true },
    orderBy: { startsAt: 'asc' },
  });

  // Build a human-readable active filter summary
  const filters: string[] = [];
  if (query) filters.push(`"${query}"`);
  if (city) filters.push(`in ${city}`);
  if (category) filters.push(categoryLabel(category));
  if (period === 'weekend') filters.push('this weekend');
  if (date) filters.push(`from ${date}`);

  return (
    <main className="min-h-screen bg-surface">
      {/* Search bar strip */}
      <div className="bg-card border-b border-ink/5 py-4">
        <Container>
          <SearchBar defaultValues={searchParams} />
        </Container>
      </div>

      <Container className="py-8">
        {/* Heading + filter summary */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-ink">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </h1>
          {filters.length > 0 && (
            <p className="text-muted text-sm mt-1">
              Filtered by: {filters.join(' · ')}
            </p>
          )}
        </div>

        {/* Category chips */}
        <div className="mb-6">
          <CategoryFilter active={category} />
        </div>

        {/* Results */}
        <EventGrid events={events} />
      </Container>
    </main>
  );
}
