import clsx from 'clsx';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel, getHomeNav } from '@/i18n/homeNav';
import type { ListedShow } from '@/lib/data/shows';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';

const EVENT_CATEGORY_EMOJI: Record<string, string> = {
  concierto: '🎵',
  festival: '🎉',
  exposicion: '🖼️',
  charla: '🎤',
  'obra-de-teatro': '🎭',
  'evento-interactivo': '🕹️',
  otros: '🎟️',
};

// Span pattern that gives the masonry its afisha-like rhythm: one hero tile, a
// couple of wide tiles, the rest square. Seven tiles fill a 4-column desktop
// grid exactly, so the homepage does not end with an empty right-hand gutter.
const SPANS = [
  'sm:col-span-2 sm:row-span-2',
  '',
  '',
  'sm:col-span-2',
  '',
  '',
  'sm:col-span-2',
];

type MosaicTile =
  | { kind: 'show'; category: EventCategory; show: ListedShow }
  | { kind: 'category'; category: EventCategory };

function buildCategoryMosaic(items: ListedShow[]): MosaicTile[] {
  const used = new Set<string>();

  return EVENT_CATEGORIES.map((category) => {
    const show = items.find((item) => !used.has(item.id) && item.categories.includes(category));
    if (show) {
      used.add(show.id);
      return { kind: 'show', category, show };
    }
    return { kind: 'category', category };
  });
}

// Diversified event mosaic under the date block: one slot per canonical event
// category. Real shows are used where available; empty categories still render a
// category tile so the grid always occupies the full horizontal rhythm.
export function Mosaic({ items }: { items: ListedShow[] }) {
  const locale = getLocale();
  const nav = getHomeNav(locale);
  const tiles = buildCategoryMosaic(items);
  if (tiles.length === 0) return null;

  return (
    <section className="pb-3 pt-6" aria-labelledby="home-featured-title">
      <Container>
        <div className="mb-4 flex items-center justify-between gap-4 max-[360px]:flex-col max-[360px]:items-start max-[360px]:gap-2">
          <h2 id="home-featured-title" className="text-lg font-extrabold text-ink sm:text-xl">
            {nav.featuredTitle}
          </h2>
          <Link
            href="/teatros"
            className="shrink-0 text-sm font-semibold text-coral no-underline hover:underline"
          >
            {nav.featuredCta} →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:auto-rows-[180px] sm:grid-flow-dense lg:grid-cols-4">
          {tiles.map((tile, i) => {
            const cat = tile.category;
            const isShow = tile.kind === 'show';
            const show = isShow ? tile.show : null;
            const key = tile.kind === 'show' ? tile.show.id : cat;
            const external = !!show?.sourceUrl;
            const title = show?.title ?? eventCategoryLabel(locale, cat);
            const venue = show?.theater?.name;
            return (
              <a
                key={key}
                href={show?.sourceUrl ?? '/teatros'}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={clsx(
                  'group relative min-h-[10.75rem] overflow-hidden rounded-lg bg-surface no-underline sm:aspect-auto',
                  SPANS[i % SPANS.length]
                )}
              >
                {show?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={show.imageUrl}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <CoverPlaceholder seed={show?.id ?? cat} glyph={EVENT_CATEGORY_EMOJI[cat]} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className="mb-1 inline-block rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    {eventCategoryLabel(locale, cat)}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white sm:text-base">
                    {title}
                  </h3>
                  {venue && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{venue}</p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
