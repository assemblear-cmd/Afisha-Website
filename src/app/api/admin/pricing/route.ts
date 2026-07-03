import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireAdmin } from '@/lib/authz';
import { adminPricingSchema } from '@/lib/organizer/validation';

// Admin pricing editor: hourly CLP prices for the 7 homepage tiles and the
// promo service prices (incl. the scanner add-on). Discount tiers live in
// src/lib/promotion/pricing.ts as tested business constants.

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = adminPricingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid pricing payload.');

    await prisma.$transaction([
      ...parsed.data.tiles.map((tile) =>
        prisma.homepageTile.update({
          where: { id: tile.id },
          data: { hourlyPriceClp: tile.hourlyPriceClp },
        })
      ),
      ...parsed.data.services.map((service) =>
        prisma.promoService.update({
          where: { id: service.id },
          data: { priceClp: service.priceClp },
        })
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
