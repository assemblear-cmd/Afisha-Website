import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { organizerBalances } from '@/lib/finance/ledger';
import { formatMoney } from '@/lib/money';
import { Card, LinkButton } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function OrganizerDashboardPage() {
  const user = (await getCurrentUser())!;

  const [events, soldTickets, checkedIn, balances, payouts, promoOrders] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: user.id },
      select: { id: true, title: true, status: true, startsAt: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.ticket.count({
      where: { event: { organizerId: user.id }, status: { in: ['ISSUED', 'CHECKED_IN'] } },
    }),
    prisma.ticket.count({ where: { event: { organizerId: user.id }, status: 'CHECKED_IN' } }),
    organizerBalances(user.id),
    prisma.payoutRequest.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { event: { select: { title: true } } },
    }),
    prisma.promotionOrder.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { event: { select: { title: true } }, items: true },
    }),
  ]);

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Tickets sold', value: String(soldTickets) },
    { label: 'Checked in', value: String(checkedIn) },
    { label: 'Gross revenue', value: formatMoney(balances.grossClp) },
    { label: 'DondeGO commission (10%)', value: formatMoney(balances.commissionClp) },
    { label: 'Net revenue', value: formatMoney(balances.netClp) },
    { label: 'Pending balance', value: formatMoney(balances.pendingClp) },
    { label: 'Available balance', value: formatMoney(balances.availableClp) },
    { label: 'Paid out', value: formatMoney(balances.paidOutClp) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Organizer dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/organizer/events/new" variant="primary" size="sm">
            Create event
          </LinkButton>
          <LinkButton href="/organizer/scanner" variant="ghost" size="sm">
            Open scanner
          </LinkButton>
          <LinkButton href="/organizer/payouts" variant="ghost" size="sm">
            Payouts
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-lg font-bold text-ink">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Your events</h2>
          <Link href="/organizer/events" className="text-sm font-semibold text-coral no-underline hover:underline">
            All events →
          </Link>
        </div>
        {events.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No events yet. Create your first event to start selling tickets.
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <Card key={event.id} className="flex items-center justify-between gap-4 p-4">
                <Link
                  href={`/organizer/events/${event.id}`}
                  className="min-w-0 flex-1 truncate font-semibold text-ink no-underline hover:text-coral"
                >
                  {event.title}
                </Link>
                <StatusBadge status={event.status} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Payout requests</h2>
          {payouts.length === 0 ? (
            <Card className="p-6 text-sm text-muted">No payout requests yet.</Card>
          ) : (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <Card key={payout.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{payout.event.title}</p>
                    <p className="text-muted">{formatMoney(payout.amountClp)}</p>
                  </div>
                  <StatusBadge status={payout.status} />
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Promotion orders</h2>
          {promoOrders.length === 0 ? (
            <Card className="p-6 text-sm text-muted">
              No promotion orders yet. Buy a homepage tile or promo services from an event page.
            </Card>
          ) : (
            <div className="space-y-2">
              {promoOrders.map((order) => (
                <Card key={order.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{order.event.title}</p>
                    <p className="text-muted">
                      {order.items.length} item{order.items.length === 1 ? '' : 's'} ·{' '}
                      {formatMoney(order.totalClp)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
