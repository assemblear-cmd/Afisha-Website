import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { isOrganizer } from '@/lib/authz';
import { Card, Container, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Organizer' };

const NAV = [
  { href: '/organizer', label: 'Dashboard' },
  { href: '/organizer/events', label: 'Events' },
  { href: '/organizer/scanner', label: 'Scanner' },
  { href: '/organizer/payouts', label: 'Payouts' },
];

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/organizer');

  if (!isOrganizer(user)) {
    return (
      <Container className="py-16 max-w-lg text-center">
        <Card className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-ink">Organizer access required</h1>
          <p className="text-body">
            Your account is a customer account. Register an organizer account to create and manage
            events.
          </p>
          <LinkButton href="/register" variant="primary">
            Register as organizer
          </LinkButton>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-black/10 pb-4 dark:border-white/10">
        <span className="mr-2 text-sm font-extrabold uppercase tracking-wide text-coral">
          Organizer
        </span>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded px-3 py-1.5 text-sm font-semibold text-body no-underline transition hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </Container>
  );
}
