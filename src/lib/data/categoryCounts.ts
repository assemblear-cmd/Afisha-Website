import { prisma } from '@/lib/prisma';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';

export type CategoryCount = { category: EventCategory; count: number };

function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Site-wide upcoming-event counts per aggregator category: active scraped
 * shows plus published organizer events. Only categories with at least one
 * event are returned, busiest first (ties keep the canonical taxonomy order),
 * so navigation strips can render exactly what has content.
 */
export async function getEventCategoryCounts(): Promise<CategoryCount[]> {
  const now = new Date();

  const [shows, events] = await Promise.all([
    prisma.show.findMany({
      where: { isActive: true, OR: [{ startsAt: { gte: now } }, { startsAt: null }] },
      select: { categories: true },
    }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED', isPublished: true, startsAt: { gte: now } },
      select: { category: true },
    }),
  ]);

  const counts = new Map<EventCategory, number>();
  const add = (category: EventCategory) => counts.set(category, (counts.get(category) ?? 0) + 1);

  for (const show of shows) {
    const categories = new Set(show.categories.filter(isEventCategory));
    if (categories.size === 0) categories.add('otros');
    categories.forEach(add);
  }
  for (const event of events) {
    add(isEventCategory(event.category) ? event.category : 'otros');
  }

  return EVENT_CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0)
    .map((category) => ({ category, count: counts.get(category)! }))
    .sort((a, b) => b.count - a.count);
}
