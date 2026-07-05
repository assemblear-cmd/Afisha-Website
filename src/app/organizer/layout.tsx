import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { Container } from '@/components/ui';

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
