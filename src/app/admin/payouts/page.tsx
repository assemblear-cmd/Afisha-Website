import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { PayoutActions } from '@/components/admin/PayoutActions';

export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payoutRequest.findMany({
    include: {
      event: { select: { title: true, status: true } },
      organizer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Payout requests</h1>
      <p className="text-sm text-muted">
        Manual payout workflow: approve, transfer the money to the organizer, then mark as paid.
        Automated Stripe Connect payouts are a future extension.
      </p>

      {payouts.length === 0 ? (
        <Card className="p-8 text-center text-muted">No payout requests.</Card>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <Card key={payout.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {formatMoney(payout.amountClp)} — {payout.event.title}
                  </p>
                  <p className="text-xs text-muted">
                    {payout.organizer.name} ({payout.organizer.email}) · requested{' '}
                    {formatDateTime(payout.createdAt)} · event {payout.event.status}
                  </p>
                  {payout.notes && <p className="text-xs text-muted">Organizer: {payout.notes}</p>}
                  {payout.adminNotes && <p className="text-xs text-muted">Admin: {payout.adminNotes}</p>}
                </div>
                <StatusBadge status={payout.status} />
              </div>
              {['PENDING', 'IN_REVIEW', 'APPROVED', 'PROCESSING'].includes(payout.status) && (
                <PayoutActions payoutId={payout.id} status={payout.status} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
