import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { Card, Container } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AccountTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/account/tickets');

  // Tickets bought while logged in (ownerUserId) plus guest purchases made
  // with the same email before registering.
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [{ ownerUserId: user.id }, { order: { buyerEmail: user.email } }],
    },
    include: {
      event: { select: { id: true, title: true, startsAt: true, venue: true } },
      ticketType: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">My tickets</h1>

      {tickets.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          No tickets yet.{' '}
          <Link href="/events" className="font-semibold text-coral no-underline hover:underline">
            Browse events →
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/account/tickets/${ticket.id}`} className="block no-underline">
              <Card className="flex items-center justify-between gap-3 p-4 transition hover:border-coral">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{ticket.event.title}</p>
                  <p className="text-sm text-muted">
                    {ticket.ticketType.name} · {formatDateTime(ticket.event.startsAt)} ·{' '}
                    {ticket.event.venue}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
