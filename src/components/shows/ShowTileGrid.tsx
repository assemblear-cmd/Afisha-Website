import { Badge, CoverPlaceholder } from '@/components/ui';
import type { Locale } from '@/i18n/config';
import { eventCategoryLabel } from '@/i18n/homeNav';
import { isEventCategory } from '@/lib/data/shows';
import { formatListingPrice, formatTime } from '@/lib/format';
import type { EventCategory } from '@/lib/taxonomy';

const DISPLAY_TZ = 'America/Santiago';
const LOCALE_TAGS: Record<string, string> = { es: 'es-CL', en: 'en-US' };

const CATEGORY_GLYPHS: Record<EventCategory, string> = {
  concierto: 'M',
  festival: 'F',
  exposicion: 'E',
  charla: 'C',
  'obra-de-teatro': 'T',
  'evento-interactivo': '+',
  comedia: ':)',
  'fiesta-y-vida-nocturna': 'N',
  networking: 'NW',
  negocios: '$',
  tecnologia: '{}',
  gastronomia: 'G',
  'curso-taller': 'W',
  'salud-y-bienestar': 'S',
  deportes: 'D',
  familia: 'K',
  cine: 'P',
  beneficencia: 'B',
  'religion-espiritualidad': 'R',
  otros: '*',
};

type TileShow = {
  id: string;
  title: string;
  startsAt: Date | null;
  venue: string | null;
  categories: string[];
  priceText?: string | null;
  priceCents: number | null;
  currency: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  theater: {
    name: string;
    website: string | null;
  };
};

type ShowTileGridProps = {
  activeCategory?: EventCategory;
  freeLabel: string;
  locale: Locale;
  shows: TileShow[];
  tbaLabel: string;
};

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.es;
}

function dayLabelFromDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
    timeZone: DISPLAY_TZ,
  })
    .format(date)
    .replace(/\./g, '');
}

function primaryCategory(show: TileShow): EventCategory {
  return show.categories.find(isEventCategory) ?? 'otros';
}

export function ShowTileGrid({ activeCategory, freeLabel, locale, shows, tbaLabel }: ShowTileGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shows.map((show) => {
        const category = activeCategory ?? primaryCategory(show);
        const href = show.sourceUrl ?? show.theater.website ?? '/calendario';
        const external = href.startsWith('http');
        const priceLabel = formatListingPrice(show.priceCents, show.currency, freeLabel, show.priceText);

        return (
          <a
            key={show.id}
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="group overflow-hidden rounded-lg bg-white text-[#1E0A3C] no-underline shadow-card ring-coral transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 dark:bg-card dark:text-white dark:shadow-none"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <CoverPlaceholder seed={show.id} glyph={CATEGORY_GLYPHS[category]} />
              {show.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={show.imageUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 z-10 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 z-30">
                <Badge className="bg-white/90 text-[#1E0A3C] dark:bg-card/90 dark:text-white">
                  {eventCategoryLabel(locale, category)}
                </Badge>
              </div>
            </div>

            <div className="flex min-h-[10rem] flex-col gap-2 p-4">
              <p className="text-sm font-bold text-coral">
                {show.startsAt ? `${dayLabelFromDate(show.startsAt, locale)} · ${formatTime(show.startsAt.toISOString(), locale)}` : tbaLabel}
              </p>
              <h2 className="line-clamp-2 text-lg font-bold leading-snug text-[#1E0A3C] dark:text-white">
                {show.title}
              </h2>
              <p className="line-clamp-2 text-sm text-[#6F7287] dark:text-white/70">
                {show.theater.name}
                {show.venue ? ` · ${show.venue}` : ''}
              </p>
              {priceLabel && (
                <p className="mt-auto text-sm font-semibold text-[#1E0A3C] dark:text-white">
                  {priceLabel}
                </p>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
