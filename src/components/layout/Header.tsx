import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Container, LinkButton } from '@/components/ui';

export async function Header() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-ink/10">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-extrabold text-ink no-underline">
              Afish<span className="text-coral">a</span>
              <span className="text-coral">.</span>
            </Link>
            <Link
              href="/events"
              className="hidden sm:inline text-sm font-medium text-body hover:text-coral no-underline"
            >
              Browse events
            </Link>
          </div>

          <nav className="flex items-center gap-3">
            {user ? (
              <>
                {user.role === 'organizer' && (
                  <>
                    <Link
                      href="/dashboard"
                      className="hidden sm:inline text-sm font-medium text-ink hover:text-coral no-underline"
                    >
                      Dashboard
                    </Link>
                    <LinkButton href="/dashboard/events/new" variant="primary" size="sm">
                      Create event
                    </LinkButton>
                  </>
                )}
                <span className="hidden sm:inline text-sm text-muted">Hi, {firstName}</span>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="text-sm font-medium text-ink hover:text-coral"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink hover:text-coral no-underline"
                >
                  Log in
                </Link>
                <LinkButton href="/register" variant="primary" size="sm">
                  Sign up
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </Container>
    </header>
  );
}
