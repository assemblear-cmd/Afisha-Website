import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [
    pendingEvents,
    pendingPromoItems,
    pendingPayouts,
    recentOrders,
    recentScans,
    ledgerTotals,
    payoutHolds,
  ] = await Promise.all([
    prisma.event.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW', 'APPROVED'] } } }),
    prisma.promotionOrderItem.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.payoutRequest.count({ where: { status: { in: ['PENDING', 'IN_REVIEW'] } } }),
    prisma.order.findMany({
      where: { status: { in: ['PAID', 'paid'] } },
      include: { event: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.ticketScan.findMany({
      include: {
        event: { select: { title: true } },
        scannedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      where: { type: { in: ['TICKET_SALE_GROSS', 'PLATFORM_COMMISSION', 'ORGANIZER_NET_CREDIT', 'REFUND_DEBIT', 'PAYOUT_PAID'] } },
      _sum: { amountClp: true },
    }),
    prisma.payoutRequest.aggregate({
      where: { status: { in: ['PENDING', 'IN_REVIEW', 'APPROVED', 'PROCESSING'] } },
      _sum: { amountClp: true },
    }),
  ]);

  const sumOf = (type: string) =>
    ledgerTotals.find((row) => row.type === type)?._sum.amountClp ?? 0;
  const gross = sumOf('TICKET_SALE_GROSS');
  const commission = Math.abs(sumOf('PLATFORM_COMMISSION'));
  const organizerNet = sumOf('ORGANIZER_NET_CREDIT') + sumOf('REFUND_DEBIT');
  const paidOut = Math.abs(sumOf('PAYOUT_PAID'));
  // Owed to organizers = lifetime net minus already paid out.
  const payable = organizerNet - paidOut;

  const queues = [
    { href: '/admin/events?filter=review', label: 'Event submissions', count: pendingEvents },
    { href: '/admin/promotions', label: 'Promotion requests', count: pendingPromoItems },
    { href: '/admin/payouts', label: 'Payout requests', count: pendingPayouts },
  ];

  const money = [
    { label: 'Gross ticket sales', value: formatMoney(gross) },
    { label: 'Platform commission', value: formatMoney(commission) },
    { label: 'Organizer payable', value: formatMoney(payable) },
    { label: 'Held in payout requests', value: formatMoney(payoutHolds._sum.amountClp ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">Admin dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {queues.map((queue) => (
          <Link key={queue.href} href={queue.href} className="no-underline">
            <Card className="p-5 transition hover:border-coral">
              <p className="text-3xl font-extrabold text-ink">{queue.count}</p>
              <p className="text-sm text-muted">{queue.label} awaiting review</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {money.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-lg font-bold text-ink">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Recent ticket sales</h2>
          {recentOrders.length === 0 ? (
            <Card className="p-6 text-sm text-muted">No paid orders yet.</Card>
          ) : (
            <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{order.event.title}</p>
                    <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span className="shrink-0 font-bold text-ink">
                    {formatMoney(order.totalCents, order.currency)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Recent scan activity</h2>
          {recentScans.length === 0 ? (
            <Card className="p-6 text-sm text-muted">No scans yet.</Card>
          ) : (
            <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
              {recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{scan.event.title}</p>
                    <p className="text-xs text-muted">
                      {scan.scannedBy.email} · {formatDateTime(scan.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={scan.result} />
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
