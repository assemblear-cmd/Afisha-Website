import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/ui';
import { DateStrip, type DayChip } from '@/components/home/DateStrip';
import { ShowTileGrid } from '@/components/shows/ShowTileGrid';
import { getDictionary } from '@/i18n/config';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel } from '@/i18n/homeNav';
import { getCurrentUser } from '@/lib/auth';
import { getShowsForDate, isEventCategory, type DateShow } from '@/lib/data/shows';
import { getLikedKeys } from '@/lib/data/likes';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';
import { addDaysToKey, isDateKey } from '@/lib/weekend';

export const dynamic = 'force-dynamic';

const DISPLAY_TZ = 'America/Santiago';
const LOCALE_TAGS: Record<string, string> = { es: 'es-CL', en: 'en-US' };

type DatePageProps = {
  params: {
    date: string;
  };
  searchParams: {
    category?: string;
  };
};

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.es;
}

function dateHeading(dateKey: string, locale: string): string {
  const heading = new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  }).format(new Date(`${dateKey}T12:00:00Z`));

  return heading.charAt(0).toLocaleUpperCase(localeTag(locale)) + heading.slice(1);
}

function dateStripDays(dateKey: string, locale: string): DayChip[] {
  const tag = localeTag(locale);
  const dayFmt = new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: DISPLAY_TZ });
  const monthFmt = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: DISPLAY_TZ });
  const weekdayFmt = new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: DISPLAY_TZ });
  const strip = (value: string) => value.replace(/\.$/, '');

  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysToKey(dateKey, i - 3);
    const date = new Date(`${iso}T12:00:00Z`);
    const dow = date.getUTCDay();

    return {
      iso,
      day: dayFmt.format(date),
      month: strip(monthFmt.format(date)),
      weekday: strip(weekdayFmt.format(date)),
      isWeekend: dow === 0 || dow === 6,
    };
  });
}

function primaryCategory(show: DateShow): EventCategory {
  return show.categories.find(isEventCategory) ?? 'otros';
}

function categoryCounts(shows: DateShow[]): Map<EventCategory, number> {
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

export async function generateMetadata({ params }: DatePageProps): Promise<Metadata> {
  const locale = getLocale();
  const t = getDictionary(locale).datePage;
  if (!isDateKey(params.date)) return { title: t.metaTitle };

  return { title: `${dateHeading(params.date, locale)} — ${t.metaTitle}` };
}

export default async function DatePage({ params, searchParams }: DatePageProps) {
  if (!isDateKey(params.date)) notFound();

  const locale = getLocale();
  const dict = getDictionary(locale);
  const t = dict.datePage;
  const activeCategory = isEventCategory(searchParams.category) ? searchParams.category : undefined;
  const allShows = await getShowsForDate(params.date);
  const shows = activeCategory
    ? allShows.filter((show) => show.categories.includes(activeCategory))
    : allShows;
  const counts = categoryCounts(allShows);
  const title = dateHeading(params.date, locale);
  const days = dateStripDays(params.date, locale);
  const user = await getCurrentUser();
  const likedKeys = user ? await getLikedKeys(user.id) : undefined;

  return (
    <main className="min-h-screen bg-surface dark:bg-canvas">
      <div className="border-b border-[#1E0A3C]/10 bg-white py-7 text-[#1E0A3C] dark:border-white/10 dark:bg-card dark:text-white">
        <Container>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-coral">{t.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#1E0A3C] sm:text-4xl dark:text-white">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#6F7287] dark:text-white/70">
                {shows.length} {shows.length === 1 ? t.eventSingular : t.eventsCount}
              </p>
            </div>
            <Link href="/calendario" className="text-sm font-semibold text-coral no-underline hover:underline">
              {t.fullCalendar} →
            </Link>
          </div>

          <div className="mt-6">
            <DateStrip days={days} ariaLabel={t.pickDateAria} selectedIso={params.date} />
          </div>

          <nav aria-label={t.categoriesAria} className="mt-6 flex gap-2 overflow-x-auto pb-1">
            <Link
              href={`/calendario/${params.date}`}
              aria-current={!activeCategory ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold no-underline ${
                !activeCategory
                  ? 'bg-coral text-white'
                  : 'bg-surface text-[#1E0A3C] hover:text-coral dark:bg-white/10 dark:text-white'
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
                  href={`/calendario/${params.date}?category=${category}`}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold no-underline ${
                    active
                      ? 'bg-coral text-white'
                      : 'bg-surface text-[#1E0A3C] hover:text-coral dark:bg-white/10 dark:text-white'
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
        {shows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#1E0A3C]/15 bg-white/70 px-4 py-12 text-center dark:border-white/15 dark:bg-card">
            <p className="text-lg font-semibold text-[#1E0A3C] dark:text-white">{t.emptyTitle}</p>
            <p className="mt-2 text-sm text-[#6F7287] dark:text-white/70">{t.emptyText}</p>
          </div>
        ) : (
          <ShowTileGrid
            activeCategory={activeCategory}
            freeLabel={t.free}
            locale={locale}
            shows={shows}
            tbaLabel={t.tba}
            canLike={!!user}
            likedKeys={likedKeys}
            likeLabel={dict.calendar.like}
            unlikeLabel={dict.calendar.unlike}
          />
        )}
      </Container>
    </main>
  );
}
