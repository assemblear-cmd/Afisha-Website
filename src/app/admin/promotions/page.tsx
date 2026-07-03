import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { PromoItemActions } from '@/components/admin/PromoItemActions';

export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  const orders = await prisma.promotionOrder.findMany({
    include: {
      event: { select: { id: true, title: true } },
      organizer: { select: { name: true, email: true } },
      payment: { select: { status: true } },
      items: {
        include: {
          promoService: { select: { name: true, code: true } },
          placement: { include: { tile: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Promotion moderation</h1>
      <p className="text-sm text-muted">
        Paid homepage tile placements and promo services. Approve a placement to schedule it (it
        goes LIVE automatically inside its window); reject to free the slot.
      </p>

      {orders.length === 0 ? (
        <Card className="p-8 text-center text-muted">No promotion orders yet.</Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{order.event.title}</p>
                  <p className="text-xs text-muted">
                    {order.organizer.name} ({order.organizer.email}) ·{' '}
                    {formatDateTime(order.createdAt)} · payment{' '}
                    {order.payment?.status ?? 'NONE'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{formatMoney(order.totalClp)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-black/10 p-3 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {item.kind === 'TILE_PLACEMENT'
                            ? `${item.placement?.tile.name ?? 'Tile placement'} · ${item.placement?.hours}h`
                            : item.promoService?.name ?? 'Promo service'}
                          {' · '}
                          {formatMoney(item.unitPriceClp)}
                        </p>
                        {item.placement && (
                          <p className="text-xs text-muted">
                            {formatDateTime(item.placement.startAt)} →{' '}
                            {formatDateTime(item.placement.endAt)}
                          </p>
                        )}
                        {item.adminNotes && (
                          <p className="text-xs text-muted">Note: {item.adminNotes}</p>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    {['PENDING_REVIEW', 'PAID', 'APPROVED'].includes(item.status) && (
                      <div className="mt-2">
                        <PromoItemActions itemId={item.id} status={item.status} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
