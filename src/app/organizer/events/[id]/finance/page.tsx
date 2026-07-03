import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { eventFinance } from '@/lib/finance/ledger';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { PayoutRequestButton } from '@/components/organizer/PayoutRequestButton';

export const dynamic = 'force-dynamic';

export default async function OrganizerFinancePage({ params }: { params: { id: string } }) {
  const user = (await getCurrentUser())!;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event || (!isAdmin(user) && event.organizerId !== user.id)) notFound();

  const [finance, ledger, payouts] = await Promise.all([
    eventFinance(event.id),
    prisma.ledgerTransaction.findMany({
      where: { eventId: event.id, organizerId: event.organizerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.payoutRequest.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const stats = [
    { label: 'Tickets sold', value: String(finance.soldTickets) },
    { label: 'Checked in', value: String(finance.checkedInTickets) },
    { label: 'Gross revenue', value: formatMoney(finance.grossClp) },
    { label: 'Commission (10%)', value: formatMoney(finance.commissionClp) },
    { label: 'Net revenue', value: formatMoney(finance.netClp) },
    { label: 'Paid out', value: formatMoney(finance.paidOutClp) },
    {
      label: finance.isCompleted ? 'Available for payout' : 'Pending (until completed)',
      value: formatMoney(finance.isCompleted ? finance.availableClp : finance.netClp),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Finance — {event.title}</h1>
        <StatusBadge status={event.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-lg font-bold text-ink">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-2 text-lg font-bold text-ink">Payout</h2>
        {finance.isCompleted ? (
          finance.availableClp > 0 ? (
            <PayoutRequestButton eventId={event.id} availableClp={finance.availableClp} />
          ) : (
            <p className="text-sm text-muted">No available balance for this event.</p>
          )
        ) : (
          <p className="text-sm text-muted">
            Payouts unlock after the event is marked completed by DondeGO. Until then the net
            revenue stays in the pending balance.
          </p>
        )}
        {payouts.length > 0 && (
          <div className="mt-4 space-y-2">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-body">
                  {formatMoney(payout.amountClp)} · {formatDateTime(payout.createdAt)}
                </span>
                <StatusBadge status={payout.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Ledger (1 token = 1 CLP)</h2>
        {ledger.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No ledger entries yet.</Card>
        ) : (
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{entry.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted">{formatDateTime(entry.createdAt)}</p>
                </div>
                <span
                  className={
                    entry.amountClp >= 0
                      ? 'font-bold text-green-700 dark:text-green-400'
                      : 'font-bold text-red-700 dark:text-red-400'
                  }
                >
                  {entry.amountClp >= 0 ? '+' : ''}
                  {formatMoney(entry.amountClp)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
