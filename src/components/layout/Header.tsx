import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Container, LinkButton } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { LanguageMenu } from './LanguageMenu';
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

export async function Header() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const locale = getLocale();
  const t = getDictionary(locale).nav;

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E2EF] bg-white text-[#1E0A3C]">
      <Container>
        <div className="flex h-16 items-center gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 text-xl font-extrabold text-[#1E0A3C] no-underline">
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

          {/* Nav */}
          <nav className="ml-auto flex items-center gap-3 sm:gap-5">
            {user ? (
              <>
                {user.role === 'organizer' ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="hidden text-sm font-medium text-[#39364F] no-underline hover:text-coral md:inline"
                    >
                      {t.dashboard}
                    </Link>
                    <LinkButton href="/dashboard/events/new" variant="primary" size="sm">
                      {t.createEvent}
                    </LinkButton>
                  </>
                ) : (
                  <Link
                    href="/dashboard/events/new"
                    className="hidden text-sm font-medium text-[#39364F] no-underline hover:text-coral md:inline"
                  >
                    {t.createEvent}
                  </Link>
                )}
                <span className="hidden text-sm text-[#6F7287] sm:inline">
                  {t.greeting}, {firstName}
                </span>
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
