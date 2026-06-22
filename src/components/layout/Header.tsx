import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Container, LinkButton } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';
import { LanguageMenu } from './LanguageMenu';

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

function PinIcon({ className }: { className?: string }) {
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
      <path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export async function Header() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(' ')[0] ?? '';
  const locale = getLocale();
  const t = getDictionary(locale).nav;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white">
      <Container>
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 text-xl font-extrabold text-ink no-underline">
            Afish<span className="text-coral">a</span>
            <span className="text-coral">.</span>
          </Link>

          {/* Inline pill search (desktop) — plain GET form, navigates to /events */}
          <form
            action="/events"
            method="get"
            className="hidden h-11 max-w-xl flex-1 items-center rounded-full border border-ink/15 bg-white pl-4 pr-1.5 shadow-sm focus-within:border-coral lg:flex"
          >
            <SearchIcon className="text-muted" />
            <input
              name="query"
              type="text"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-body placeholder:text-muted focus:outline-none"
            />
            <span className="h-6 w-px bg-ink/15" />
            <PinIcon className="ml-3 text-muted" />
            <input
              name="city"
              type="text"
              placeholder={t.locationPlaceholder}
              aria-label={t.locationPlaceholder}
              className="w-28 bg-transparent px-2 text-sm text-body placeholder:text-muted focus:outline-none"
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
            <Link
              href="/events"
              className="hidden text-sm font-medium text-body no-underline hover:text-coral lg:inline"
            >
              {t.findEvents}
            </Link>

            <Link
              href="/teatros"
              className="text-sm font-medium text-body no-underline hover:text-coral"
            >
              {t.teatros}
            </Link>

            {user ? (
              <>
                {user.role === 'organizer' ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="hidden text-sm font-medium text-body no-underline hover:text-coral md:inline"
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
                    className="hidden text-sm font-medium text-body no-underline hover:text-coral md:inline"
                  >
                    {t.createEvent}
                  </Link>
                )}
                <span className="hidden text-sm text-muted sm:inline">
                  {t.greeting}, {firstName}
                </span>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="text-sm font-medium text-ink hover:text-coral">
                    {t.logout}
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/events/new"
                  className="hidden text-sm font-medium text-body no-underline hover:text-coral md:inline"
                >
                  {t.createEvent}
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink no-underline hover:text-coral"
                >
                  {t.login}
                </Link>
                <LinkButton href="/register" variant="primary" size="sm">
                  {t.signup}
                </LinkButton>
              </>
            )}

            <LanguageMenu current={locale} />
          </nav>
        </div>
      </Container>
    </header>
  );
}
