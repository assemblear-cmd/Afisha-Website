import Link from 'next/link';
import { Container } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { eventCategoryLabel, getHomeNav } from '@/i18n/homeNav';
import { getEventCategoryCounts } from '@/lib/data/categoryCounts';

// Two stacked navigation strips at the very top of the homepage (afisha-style).
// The primary (dark) strip is data-driven: only aggregator categories that
// actually have upcoming events, ordered left-to-right by event count. The
// secondary strip keeps its curated topic links.
export async function TopCategoryNav() {
  const locale = getLocale();
  const nav = getHomeNav(locale);
  const categories = await getEventCategoryCounts();

  return (
    <div className="border-b border-[#E7E2EF] text-base font-bold uppercase tracking-wide sm:text-xs">
      {/* Dark strip — live categories, busiest first */}
      {categories.length > 0 && (
        <div className="border-b border-coral/60 bg-white sm:border-b-0 sm:bg-neutral-900">
          <Container>
            <nav aria-label={nav.primaryAria} className="-mx-3 flex items-center overflow-x-auto py-3 sm:py-2.5">
              {categories.map(({ category, count }) => (
                <Link
                  key={category}
                  href={`/calendario?category=${category}`}
                  className="whitespace-nowrap border-l border-[#D8D0E5] px-3 text-[#1E0A3C] no-underline first:border-l-0 hover:text-coral sm:border-white/15 sm:text-white/90 sm:hover:text-white"
                >
                  {eventCategoryLabel(locale, category)}
                  <span className="ml-1 font-normal opacity-60">{count}</span>
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      )}

      {/* Light strip — topics + right-aligned actions */}
      <div className="hidden border-t border-[#E7E2EF] bg-white sm:block">
        <Container>
          <nav aria-label={nav.secondaryAria} className="flex items-center overflow-x-auto py-2.5 text-[#1E0A3C]">
            <div className="-mx-3 flex items-center">
              {nav.secondary.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  className="whitespace-nowrap border-l border-[#D8D0E5] px-3 text-[#39364F] no-underline first:border-l-0 hover:text-coral"
                >
                  {it.label}
                </Link>
              ))}
              <span className="flex items-center gap-1 whitespace-nowrap border-l border-[#D8D0E5] px-3 text-[#39364F]">
                {nav.moreLabel}
                <span aria-hidden>▾</span>
              </span>
            </div>
            {nav.secondaryRight.length > 0 && (
              <div className="ml-auto flex items-center pl-3">
                {nav.secondaryRight.map((it) => (
                  <Link
                    key={it.label}
                    href={it.href}
                    className="whitespace-nowrap border-l border-[#D8D0E5] px-3 text-[#39364F] no-underline hover:text-coral"
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </Container>
      </div>
    </div>
  );
}
