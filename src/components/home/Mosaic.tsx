import clsx from 'clsx';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { LikeButton } from '@/components/likes/LikeButton';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel, getHomeNav } from '@/i18n/homeNav';
import type { ListedShow } from '@/lib/data/shows';
import type { PromotedTile } from '@/lib/promotion/homepage';
import { FEATURED_EVENT_CATEGORIES, type EventCategory } from '@/lib/taxonomy';

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
  const slots = FEATURED_EVENT_CATEGORIES.length;

  const counts = new Map<EventCategory, number>();
  for (const item of items) {
    for (const category of FEATURED_EVENT_CATEGORIES) {
      if (item.categories.includes(category)) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
  }

  // Only categories that actually have events, busiest first (stable sort
  // keeps the canonical order for ties).
  const ordered = [...FEATURED_EVENT_CATEGORIES]
    .filter((category) => (counts.get(category) ?? 0) > 0)
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  const used = new Set<string>();
  const tiles: MosaicTile[] = [];
  for (const category of ordered) {
    if (tiles.length >= slots) break;
    const show = items.find((item) => !used.has(item.id) && item.categories.includes(category));
    if (!show) continue;
    used.add(show.id);
    tiles.push({ kind: 'show', category, show });
  }

  // Backfill leftover slots with more real events instead of empty category
  // tiles, so the grid never advertises a category without content.
  for (const item of items) {
    if (tiles.length >= slots) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    const category =
      FEATURED_EVENT_CATEGORIES.find((c) => item.categories.includes(c)) ?? 'otros';
    tiles.push({ kind: 'show', category, show: item });
  }

  return tiles;
}

// Diversified event mosaic under the date block: one slot per event category
// that has upcoming events (busiest categories first), backfilled with more
// events so the grid keeps its full horizontal rhythm.
export function Mosaic({
  items,
  promoted = [],
  likedKeys,
  signedIn = false,
}: {
  items: ListedShow[];
  // Paid tile placements keyed by mosaic position (1..7); slots without an
  // active placement fall back to the normal category/show tile.
  promoted?: PromotedTile[];
  /** Like keys of the signed-in user, for marking hearts. */
  likedKeys?: ReadonlySet<string>;
  signedIn?: boolean;
}) {
  const locale = getLocale();
  const nav = getHomeNav(locale);
  const tiles = buildCategoryMosaic(items);
  const promotedByPosition = new Map(promoted.map((tile) => [tile.position, tile]));
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
            const promo = promotedByPosition.get(i + 1);
            if (promo) {
              return (
                <a
                  key={`promo-${promo.position}`}
                  href={`/events/${promo.eventId}`}
                  className={clsx(
                    'group relative min-h-[10.75rem] overflow-hidden rounded-lg bg-surface no-underline sm:aspect-auto',
                    i === 0 && 'col-span-2',
                    SPANS[i % SPANS.length]
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={promo.coverImage}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="mb-1 inline-block rounded bg-coral px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Promoted
                    </span>
                    <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white sm:text-base">
                      {promo.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{promo.venue}</p>
                  </div>
                </a>
              );
            }
            const cat = tile.category;
            const isShow = tile.kind === 'show';
            const show = isShow ? tile.show : null;
            const key = tile.kind === 'show' ? tile.show.id : cat;
            const external = !!show?.sourceUrl;
            const title = show?.title ?? eventCategoryLabel(locale, cat);
            const venue = show?.theater?.name;
            return (
              <div
                key={key}
                className={clsx(
                  'group relative min-h-[10.75rem] overflow-hidden rounded-lg bg-surface sm:aspect-auto',
                  i === 0 && 'col-span-2',
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
                {/* Whole-tile link as an overlay so the heart can sit above it
                    without nesting a button inside an anchor. */}
                <a
                  href={show?.sourceUrl ?? '/teatros'}
                  aria-label={title}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="absolute inset-0 z-10"
                />
                {show && (
                  <LikeButton
                    targetKey={show.wireId}
                    initialLiked={likedKeys?.has(show.wireId) ?? false}
                    signedIn={signedIn}
                    className="absolute right-2 top-2 z-20"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
