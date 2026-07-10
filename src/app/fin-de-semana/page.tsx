import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/ui';
import { ShowTileGrid } from '@/components/shows/ShowTileGrid';
import { getDictionary } from '@/i18n/config';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel } from '@/i18n/homeNav';
import { getCurrentUser } from '@/lib/auth';
import { getWeekendShows, isEventCategory, type WeekendShow } from '@/lib/data/shows';
import { getLikedKeys } from '@/lib/data/likes';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';
import { weekendWindow } from '@/lib/weekend';

export const dynamic = 'force-dynamic';

const DISPLAY_TZ = 'America/Santiago';
const LOCALE_TAGS: Record<string, string> = { es: 'es-CL', en: 'en-US' };

type WeekendPageProps = {
  searchParams: {
    category?: string;
  };
};

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.es;
}

function dayLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
    timeZone: DISPLAY_TZ,
  })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(/\./g, '');
}

function primaryCategory(show: WeekendShow): EventCategory {
  return show.categories.find(isEventCategory) ?? 'otros';
}

function categoryCounts(shows: WeekendShow[]): Map<EventCategory, number> {
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
  return { title: getDictionary(getLocale()).weekend.metaTitle };
}

export default async function WeekendPage({ searchParams }: WeekendPageProps) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const t = dict.weekend;
  const activeCategory = isEventCategory(searchParams.category) ? searchParams.category : undefined;
  const weekend = weekendWindow();
  const allShows = await getWeekendShows();
  const shows = activeCategory
    ? allShows.filter((show) => show.categories.includes(activeCategory))
    : allShows;
  const counts = categoryCounts(allShows);
  const user = await getCurrentUser();
  const likedKeys = user ? await getLikedKeys(user.id) : undefined;

  return (
    <main className="min-h-screen bg-surface">
      <div className="border-b border-ink/5 bg-card py-7">
        <Container>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-coral">
                {dayLabel(weekend.start, locale)} - {dayLabel(weekend.end, locale)}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                {t.title}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {shows.length} {shows.length === 1 ? t.eventSingular : t.eventsCount}
              </p>
            </div>
            <Link href="/calendario" className="text-sm font-semibold text-coral no-underline hover:underline">
              {t.fullCalendar} →
            </Link>
          </div>

          <nav aria-label={t.categoriesAria} className="mt-6 flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/fin-de-semana"
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
                  href={`/fin-de-semana?category=${category}`}
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
        {shows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/15 bg-card/60 px-4 py-12 text-center">
            <p className="text-lg font-semibold text-ink">{t.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted">{t.emptyText}</p>
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
