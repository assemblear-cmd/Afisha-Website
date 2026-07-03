import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Container, LinkButton } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { getHomeNav } from '@/i18n/homeNav';
import { LanguageMenu } from './LanguageMenu';
import { HeaderCalendarPicker } from './HeaderCalendarPicker';
import { ThemeToggle } from './ThemeToggle';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function MobileMenuTileIcon({ index }: { index: number }) {
  const variants = [
    <>
      <path d="M9 18V7a4 4 0 0 1 8 0v11" />
      <path d="M7 18h12" />
      <path d="M12 22h2" />
      <path d="M6 12h3" className="text-coral" />
    </>,
    <>
      <path d="M4 19h16" />
      <path d="M6 16h12V8L12 5 6 8v8Z" />
      <path d="M9 16V9" className="text-coral" />
      <path d="M15 16V9" className="text-coral" />
    </>,
    <>
      <path d="M5 17h14" />
      <path d="M7 17V6h10v11" />
      <circle cx="10" cy="10" r="1.8" className="text-coral" />
      <circle cx="14" cy="13" r="1.8" className="text-coral" />
    </>,
    <>
      <path d="M5 7c4-2 7 1 7 1s3-3 7-1v8c-4-2-7 1-7 1s-3-3-7-1V7Z" />
      <path d="M8 10l8 4" className="text-coral" />
    </>,
    <>
      <path d="M5 18h14" />
      <path d="M7 18l1-8 4-3 4 3 1 8" />
      <path d="M12 7V4" className="text-coral" />
      <path d="M9 12h6" />
    </>,
    <>
      <path d="M6 5v15" />
      <path d="M18 5v15" />
      <path d="M9 5v15" className="text-coral" />
      <path d="M15 5v15" />
    </>,
  ];

  return (
    <svg
      width="58"
      height="58"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mx-auto mb-3 text-neutral-950 dark:text-white"
    >
      {variants[index % variants.length]}
    </svg>
  );
}

function mobileMenuLabel(label: string, locale: string): string {
  const shortLabels: Record<string, string> = {
    Entretenimiento: 'Diversión',
    'Lugares interesantes': 'Lugares',
    'Solo este invierno': 'Invierno',
    Entertainment: 'Fun',
    'Interesting places': 'Places',
    'Only this winter': 'Winter',
  };
  return shortLabels[label] ?? (locale === 'es' && label === 'Niños' ? 'Niños' : label);
}

export async function Header() {
  const user = await getCurrentUser();
  const locale = getLocale();
  const t = getDictionary(locale).nav;
  const homeNav = getHomeNav(locale);
  const mobileMenuItems = [{ label: t.calendar, href: '/calendario' }, ...homeNav.primary, ...homeNav.secondary].slice(0, 12);

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950 text-white sm:border-[#E7E2EF] sm:bg-white sm:text-[#1E0A3C]">
      <Container>
        <div className="flex h-16 items-center gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="hidden shrink-0 text-xl font-extrabold text-[#1E0A3C] no-underline sm:block">
            Donde<span className="text-coral">GO</span>
          </Link>

          {/* Inline pill search (desktop) — plain GET form, navigates to /events */}
          <form
            action="/events"
            method="get"
            className="hidden h-11 max-w-xl flex-1 items-center rounded-full border border-[#D8D0E5] bg-[#F8F7FA] pl-4 pr-1.5 shadow-sm focus-within:border-coral lg:flex"
          >
            <SearchIcon className="text-[#6F7287]" />
            <input
              name="query"
              type="text"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#39364F] placeholder:text-[#6F7287] focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t.searchAria}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral text-white transition hover:bg-coral-dark"
            >
              <SearchIcon />
            </button>
          </form>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:hidden">
            <Link href="/" className="shrink-0 text-lg font-extrabold leading-none text-white no-underline">
              Donde<span className="text-coral">GO</span>
            </Link>
            <form
              action="/events"
              method="get"
              className="flex h-10 min-w-0 flex-1 items-center rounded-full border border-white/15 bg-white/10 px-2.5 text-white shadow-sm transition focus-within:border-coral"
            >
              <SearchIcon className="h-5 w-5 shrink-0 text-white/75" />
              <input
                name="query"
                type="text"
                placeholder="where to go"
                aria-label="where to go"
                className="min-w-0 flex-1 bg-transparent px-1.5 text-sm font-semibold lowercase text-white placeholder:text-white/75 focus:outline-none"
              />
            </form>
            <LanguageMenu
              current={locale}
              buttonClassName="flex shrink-0 items-center gap-1 text-sm font-semibold text-white no-underline hover:text-coral"
            />
            <HeaderCalendarPicker
              className="block sm:hidden"
              label={t.calendar}
              locale={locale}
              buttonClassName="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition hover:text-coral"
            />
            <details className="relative">
              <summary
                aria-label="Menu"
                className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full text-white transition hover:text-coral [&::-webkit-details-marker]:hidden"
              >
                <MenuIcon />
              </summary>
              <div className="fixed left-0 right-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-white text-neutral-950 shadow-2xl dark:bg-neutral-950 dark:text-white">
                <div className="flex items-center justify-between bg-coral px-5 py-5 text-white">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                      {locale === 'es' ? 'Ciudad' : 'City'}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold leading-none">{homeNav.city}</p>
                  </div>
                  <a href="#top" className="text-right text-sm font-semibold text-white no-underline">
                    <span aria-hidden className="block text-3xl leading-none">↑</span>
                    {locale === 'es' ? 'Arriba' : 'Top'}
                  </a>
                </div>
                <nav aria-label="Mobile menu" className="grid grid-cols-3 gap-y-8 px-3 py-7">
                  {mobileMenuItems.map((it, index) => (
                    <Link
                      key={`${it.label}-${it.href}`}
                      href={it.href}
                      className={`${index === 0 ? 'col-span-2' : ''} min-h-[7.25rem] px-1 text-center text-[0.8rem] font-extrabold uppercase leading-tight tracking-tight text-neutral-950 no-underline transition hover:text-coral dark:text-white`}
                    >
                      <MobileMenuTileIcon index={index} />
                      <span className="mx-auto block max-w-[6.5rem]">{mobileMenuLabel(it.label, locale)}</span>
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-neutral-200 px-5 py-4 text-sm font-semibold dark:border-white/10">
                  {user ? (
                    <div className="flex items-center gap-5">
                      {user.role === 'organizer' && (
                        <Link href="/dashboard" className="text-neutral-700 no-underline hover:text-coral dark:text-white/75">
                          {t.myEvents}
                        </Link>
                      )}
                      <form action="/api/auth/logout" method="post">
                        <button type="submit" className="text-neutral-700 hover:text-coral dark:text-white/75">
                          {t.logout}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex items-center gap-5">
                      <Link href="/login" className="text-neutral-700 no-underline hover:text-coral dark:text-white/75">
                        {t.login}
                      </Link>
                      <Link href="/register" className="text-neutral-700 no-underline hover:text-coral dark:text-white/75">
                        {t.signup}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>

          {/* Nav */}
          <nav className="ml-auto hidden items-center gap-3 sm:flex sm:gap-5">
            <HeaderCalendarPicker className="hidden sm:block" label={t.calendar} locale={locale} />
            {user ? (
              <>
                {user.role === 'organizer' ? (
                  <LinkButton href="/dashboard" variant="primary" size="sm">
                    {t.myEvents}
                  </LinkButton>
                ) : (
                  <Link
                    href="/dashboard/events/new"
                    className="hidden text-sm font-medium text-[#39364F] no-underline hover:text-coral md:inline"
                  >
                    {t.createEvent}
                  </Link>
                )}
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="text-sm font-medium text-[#1E0A3C] hover:text-coral">
                    {t.logout}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/events/new"
                  className="hidden text-sm font-medium text-[#39364F] no-underline hover:text-coral md:inline"
                >
                  {t.createEvent}
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#1E0A3C] no-underline hover:text-coral max-[360px]:hidden"
                >
                  {t.login}
                </Link>
                <LinkButton href="/register" variant="primary" size="sm">
                  {t.signup}
                </LinkButton>
              </>
            )}

            <ThemeToggle />
            <LanguageMenu current={locale} />
          </nav>
        </div>
      </Container>
    </header>
  );
}
