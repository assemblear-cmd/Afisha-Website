import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { organizerBalances } from '@/lib/finance/ledger';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { CancelPayoutButton } from '@/components/organizer/PayoutRequestButton';

export const dynamic = 'force-dynamic';

export default async function OrganizerPayoutsPage() {
  const user = (await getCurrentUser())!;

  const [balances, payouts, completedEvents] = await Promise.all([
    organizerBalances(user.id),
    prisma.payoutRequest.findMany({
      where: { organizerId: user.id },
      include: { event: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.event.findMany({
      where: { organizerId: user.id, status: 'COMPLETED' },
      select: { id: true, title: true },
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Payouts</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(balances.pendingClp)}</p>
          <p className="text-xs text-muted">Pending balance</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(balances.availableClp)}</p>
          <p className="text-xs text-muted">Available balance</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(balances.paidOutClp)}</p>
          <p className="text-xs text-muted">Paid out</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(balances.netClp)}</p>
          <p className="text-xs text-muted">Lifetime net revenue</p>
        </Card>
      </div>

      <Card className="p-5 text-sm text-body">
        Payouts are requested per completed event from its Finance page. DondeGO reviews each
        request and transfers manually; automated Stripe Connect payouts are on the roadmap.
        {completedEvents.length > 0 && (
          <span className="mt-2 block">
            Completed events:{' '}
            {completedEvents.map((event, index) => (
              <span key={event.id}>
                {index > 0 && ' · '}
                <Link
                  href={`/organizer/events/${event.id}/finance`}
                  className="font-semibold text-coral no-underline hover:underline"
                >
                  {event.title}
                </Link>
              </span>
            ))}
          </span>
        )}
      </Card>

      {payouts.length === 0 ? (
        <Card className="p-8 text-center text-muted">No payout requests yet.</Card>
      ) : (
        <div className="space-y-2">
          {payouts.map((payout) => (
            <Card key={payout.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {formatMoney(payout.amountClp)} · {payout.event.title}
                </p>
                <p className="text-xs text-muted">
                  Requested {formatDateTime(payout.createdAt)}
                  {payout.paidAt ? ` · paid ${formatDateTime(payout.paidAt)}` : ''}
                </p>
                {payout.adminNotes && <p className="text-xs text-muted">Admin: {payout.adminNotes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={payout.status} />
                {['PENDING', 'IN_REVIEW'].includes(payout.status) && (
                  <CancelPayoutButton payoutId={payout.id} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
