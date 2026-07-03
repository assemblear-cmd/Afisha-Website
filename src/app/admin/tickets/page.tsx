import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { TicketAdminActions } from '@/components/admin/TicketAdminActions';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({
      include: {
        event: { select: { title: true } },
        payment: { select: { status: true, provider: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.ticket.findMany({
      include: {
        event: { select: { title: true } },
        ticketType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">Orders & tickets</h1>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Recent orders</h2>
        {orders.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No orders yet.</Card>
        ) : (
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {order.event.title} · {order.buyerEmail}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(order.createdAt)} · {order._count.tickets} tickets · payment{' '}
                    {order.payment?.status ?? 'legacy/simulated'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-ink">
                    {formatMoney(order.totalCents, order.currency)}
                  </span>
                  <StatusBadge status={order.status.toUpperCase()} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Recent tickets</h2>
        {tickets.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No tickets yet.</Card>
        ) : (
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {ticket.event.title} · {ticket.ticketType.name}
                  </p>
                  <p className="text-xs text-muted">
                    {ticket.attendeeEmail ?? '—'} · {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  {['ISSUED', 'CHECKED_IN'].includes(ticket.status) && (
                    <TicketAdminActions ticketId={ticket.id} />
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
