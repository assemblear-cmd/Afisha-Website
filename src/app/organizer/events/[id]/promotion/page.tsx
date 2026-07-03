import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { PromotionBuilder } from '@/components/organizer/PromotionBuilder';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function OrganizerPromotionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { outcome?: string };
}) {
  const user = (await getCurrentUser())!;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event || (!isAdmin(user) && event.organizerId !== user.id)) notFound();

  const [tiles, services, placements, orders] = await Promise.all([
    prisma.homepageTile.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } }),
    prisma.promoService.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.homepageTilePlacement.findMany({
      where: { eventId: event.id },
      include: { tile: { select: { position: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.promotionOrder.findMany({
      where: { eventId: event.id },
      include: { items: { include: { promoService: true, placement: false } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const outcome = searchParams.outcome;
  const promotable = event.status === 'PUBLISHED' && event.isPublished;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Promotion — {event.title}</h1>

      {outcome === 'success' && (
        <Card className="border border-green-300 p-4 text-sm text-body dark:border-green-800">
          Payment received (or processing). Your promotion goes to DondeGO moderation and appears
          below once confirmed by the payment provider.
        </Card>
      )}
      {outcome === 'cancelled' && (
        <Card className="border border-amber-300 p-4 text-sm text-body dark:border-amber-800">
          Payment was cancelled. Nothing was charged.
        </Card>
      )}

      {!promotable ? (
        <Card className="p-6 text-sm text-muted">
          Promotion is available once the event is published. Current status:{' '}
          <StatusBadge status={event.status} />
        </Card>
      ) : (
        <PromotionBuilder
          eventId={event.id}
          isFree={event.isFree}
          scannerAddonPaid={event.scannerAddonPaid}
          tiles={tiles.map((tile) => ({
            id: tile.id,
            position: tile.position,
            name: tile.name,
            description: tile.description ?? '',
            hourlyPriceClp: tile.hourlyPriceClp,
          }))}
          services={services.map((service) => ({
            code: service.code,
            name: service.name,
            description: service.description ?? '',
            priceClp: service.priceClp,
          }))}
        />
      )}

      {placements.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Tile placements</h2>
          <div className="space-y-2">
            {placements.map((placement) => (
              <Card key={placement.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {placement.tile.name} · {placement.hours}h
                  </p>
                  <p className="text-muted">
                    {formatDateTime(placement.startAt)} → {formatDateTime(placement.endAt)} ·{' '}
                    {formatMoney(placement.totalPriceClp)}
                    {placement.discountPct > 0 ? ` (−${placement.discountPct}%)` : ''}
                  </p>
                  {placement.adminNotes && <p className="text-muted">Note: {placement.adminNotes}</p>}
                </div>
                <StatusBadge status={placement.status} />
              </Card>
            ))}
          </div>
        </section>
      )}

      {orders.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Promotion orders</h2>
          <div className="space-y-2">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{formatMoney(order.totalClp)}</p>
                  <StatusBadge status={order.status} />
                </div>
                <ul className="mt-2 space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-muted">
                      <span>
                        {item.kind === 'TILE_PLACEMENT'
                          ? 'Homepage tile placement'
                          : item.promoService?.name ?? 'Promo service'}{' '}
                        · {formatMoney(item.unitPriceClp)}
                      </span>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
