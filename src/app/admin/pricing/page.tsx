import { prisma } from '@/lib/prisma';
import { DISCOUNT_TIERS } from '@/lib/promotion/pricing';
import { Card } from '@/components/ui';
import { PricingEditor } from '@/components/admin/PricingEditor';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  const [tiles, services] = await Promise.all([
    prisma.homepageTile.findMany({ orderBy: { position: 'asc' } }),
    prisma.promoService.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Pricing</h1>
      <p className="text-sm text-muted">
        Hourly prices for the 7 homepage tiles and fixed prices for promo services, in CLP.
        Duration discounts are business constants covered by tests:{' '}
        {DISCOUNT_TIERS.map((tier) => `${tier.minHours}h → −${tier.pct}%`).join(' · ')}.
      </p>

      {tiles.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          No tiles seeded yet — run <code>npm run db:sync-commerce</code>.
        </Card>
      ) : (
        <PricingEditor
          tiles={tiles.map((tile) => ({
            id: tile.id,
            name: tile.name,
            position: tile.position,
            hourlyPriceClp: tile.hourlyPriceClp,
          }))}
          services={services.map((service) => ({
            id: service.id,
            name: service.name,
            code: service.code,
            priceClp: service.priceClp,
          }))}
        />
      )}
    </div>
  );
}
