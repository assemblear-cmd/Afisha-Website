import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, Container } from '@/components/ui';
import { getDictionary } from '@/i18n/config';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel } from '@/i18n/homeNav';
import { getCalendarShows, isEventCategory, type CalendarShow } from '@/lib/data/shows';
import { formatListingPrice, formatTime } from '@/lib/format';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const DISPLAY_TZ = 'America/Santiago';
const LOCALE_TAGS: Record<string, string> = { es: 'es-CL', en: 'en-US' };

type CalendarPageProps = {
  searchParams: {
    category?: string;
  };
};

type CategoryBucket = {
  category: EventCategory;
  shows: CalendarShow[];
};

type DayBucket = {
  key: string;
  date: Date;
  categories: CategoryBucket[];
};

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.es;
}

function chileDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function formatDayHeading(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  }).format(date);
}

function primaryCategory(show: CalendarShow): EventCategory {
  const category = show.categories.find(isEventCategory);
  return category ?? 'otros';
}

function groupByDayAndCategory(shows: CalendarShow[], forcedCategory?: EventCategory): DayBucket[] {
  const dayMap = new Map<string, { date: Date; categoryMap: Map<EventCategory, CalendarShow[]> }>();

  for (const show of shows) {
    if (!show.startsAt) continue;

    const key = chileDateKey(show.startsAt);
    const dayBucket = dayMap.get(key) ?? { date: show.startsAt, categoryMap: new Map() };
    const category = forcedCategory ?? primaryCategory(show);
    const categoryShows = dayBucket.categoryMap.get(category) ?? [];

    categoryShows.push(show);
    dayBucket.categoryMap.set(category, categoryShows);
    dayMap.set(key, dayBucket);
  }

  return [...dayMap.entries()].map(([key, bucket]) => ({
    key,
    date: bucket.date,
    categories: [...bucket.categoryMap.entries()]
      .sort(([a], [b]) => EVENT_CATEGORIES.indexOf(a) - EVENT_CATEGORIES.indexOf(b))
      .map(([category, categoryShows]) => ({ category, shows: categoryShows })),
  }));
}

function categoryCounts(shows: CalendarShow[]): Map<EventCategory, number> {
  const counts = new Map<EventCategory, number>();

  for (const show of shows) {
    const categories = new Set(show.categories.filter(isEventCategory));
    if (categories.size === 0) categories.add('otros');

    for (const category of categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return counts;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(getLocale()).calendar.metaTitle };
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const locale = getLocale();
  const t = getDictionary(locale).calendar;
  const activeCategory = isEventCategory(searchParams.category) ? searchParams.category : undefined;
  const allShows = await getCalendarShows();
  const shows = activeCategory
    ? allShows.filter((show) => show.categories.includes(activeCategory))
    : allShows;
  const counts = categoryCounts(allShows);
  const days = groupByDayAndCategory(shows, activeCategory);
  const firstDate = days[0]?.date;
  const lastDate = days[days.length - 1]?.date;

  return (
    <main className="min-h-screen bg-surface">
      <div className="border-b border-ink/5 bg-white py-6">
        <Container>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {shows.length} {t.eventsCount}
                {firstDate && lastDate ? ` · ${formatDayHeading(firstDate, locale)} - ${formatDayHeading(lastDate, locale)}` : ''}
              </p>
            </div>
            <Link href="/teatros" className="text-sm font-semibold text-coral no-underline hover:underline">
              {t.byVenue} →
            </Link>
          </div>

          <nav aria-label={t.categoriesAria} className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/calendario"
              aria-current={!activeCategory ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold no-underline ${
                !activeCategory ? 'bg-coral text-white' : 'bg-surface text-ink hover:text-coral'
              }`}
            >
              {t.allCategories}
            </Link>
            {EVENT_CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0)
              .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
              .map((category) => {
              const count = counts.get(category) ?? 0;
              const active = activeCategory === category;
              return (
                <Link
                  key={category}
                  href={`/calendario?category=${category}`}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold no-underline ${
                    active ? 'bg-coral text-white' : 'bg-surface text-ink hover:text-coral'
                  }`}
                >
                  {eventCategoryLabel(locale, category)} <span className="opacity-70">{count}</span>
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>

      <Container className="py-8">
        {days.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white/60 px-4 py-10 text-center">
            <p className="text-sm text-muted">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((day) => (
              <section key={day.key} aria-labelledby={`day-${day.key}`} className="scroll-mt-24">
                <h2 id={`day-${day.key}`} className="text-xl font-bold capitalize text-ink">
                  <Link
                    href={`/calendario/${day.key}`}
                    className="text-ink no-underline hover:text-coral hover:underline"
                  >
                    {formatDayHeading(day.date, locale)}
                  </Link>
                </h2>

                <div className="mt-3 space-y-4">
                  {day.categories.map((bucket) => (
                    <div key={bucket.category} className="overflow-hidden rounded-lg border border-ink/5 bg-white">
                      <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-ink">
                          {eventCategoryLabel(locale, bucket.category)}
                        </h3>
                        <Badge>{bucket.shows.length}</Badge>
                      </div>

                      <ol className="divide-y divide-ink/5">
                        {bucket.shows.map((show) => (
                          <li key={show.id} className="grid gap-2 px-4 py-3 md:grid-cols-[5.5rem_1fr_auto] md:items-center">
                            <p className="text-sm font-bold text-coral">
                              {show.startsAt ? formatTime(show.startsAt.toISOString(), locale) : t.tba}
                            </p>
                            <div className="min-w-0">
                              <h4 className="font-semibold leading-snug text-ink">{show.title}</h4>
                              <p className="mt-0.5 text-sm text-muted">
                                {show.theater.name}
                                {show.venue ? ` · ${show.venue}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 md:justify-end">
                              <span className="text-sm font-medium text-ink">
                                {formatListingPrice(show.priceCents, show.currency, t.free, show.priceText)}
                              </span>
                              {show.sourceUrl && (
                                <a
                                  href={show.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-semibold text-coral no-underline hover:underline"
                                >
                                  {t.tickets} →
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
