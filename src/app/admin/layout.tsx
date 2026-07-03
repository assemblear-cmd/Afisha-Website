import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { Card, Container } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin' };

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/pricing', label: 'Pricing' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/scans', label: 'Scans' },
  { href: '/admin/scanner', label: 'Scanner' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/admin');

  if (!isAdmin(user)) {
    return (
      <Container className="py-16 max-w-lg text-center">
        <Card className="p-8 space-y-3">
          <h1 className="text-2xl font-bold text-ink">Admin access required</h1>
          <p className="text-body">This section is restricted to DondeGO administrators.</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-black/10 pb-4 dark:border-white/10">
        <span className="mr-2 text-sm font-extrabold uppercase tracking-wide text-coral">Admin</span>
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
