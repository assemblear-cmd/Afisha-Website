import Link from 'next/link';
import { Container } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getHomeNav } from '@/i18n/homeNav';

// Two stacked navigation strips at the very top of the homepage (afisha-style).
// The site header above them is light, then these alternate dark / light for
// strong contrast in the dark theme too. Labels come from the active locale.
export function TopCategoryNav() {
  const locale = getLocale();
  const nav = getHomeNav(locale);

  return (
    <div className="border-b border-[#E7E2EF] text-xs font-bold uppercase tracking-wide">
      {/* Dark strip — primary categories */}
      <div className="bg-neutral-900">
        <Container>
          <nav aria-label={nav.primaryAria} className="-mx-3 flex items-center overflow-x-auto py-2.5">
            {nav.primary.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                className="whitespace-nowrap border-l border-white/15 px-3 text-white/90 no-underline first:border-l-0 hover:text-white"
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      {/* Light strip — topics + right-aligned actions */}
      <div className="border-t border-[#E7E2EF] bg-white">
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
