import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer } from '@/lib/authz';
import { promotionQuoteSchema } from '@/lib/organizer/validation';
import { quoteTilePlacement } from '@/lib/promotion/pricing';
import { BLOCKING_PLACEMENT_STATUSES } from '@/lib/promotion/availability';

// Live price + availability preview for a homepage tile slot. The organizer
// sees the exact price (with duration discount) before paying.

export async function POST(req: NextRequest) {
  try {
    await requireOrganizer();

    const parsed = promotionQuoteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid quote request.');
    const { tileId, hours } = parsed.data;

    const startAt = new Date(parsed.data.startAt);
    if (isNaN(startAt.getTime())) throw new ApiError(400, 'Invalid start date.');
    const endAt = new Date(startAt.getTime() + hours * 60 * 60 * 1000);

    const tile = await prisma.homepageTile.findUnique({ where: { id: tileId } });
    if (!tile || !tile.isActive) throw new ApiError(404, 'Tile not found.');

    const quote = quoteTilePlacement(tile.hourlyPriceClp, hours);

    const conflict = await prisma.homepageTilePlacement.findFirst({
      where: {
        tileId,
        status: { in: BLOCKING_PLACEMENT_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { startAt: true, endAt: true },
    });

    return NextResponse.json({
      quote,
      available: !conflict,
      conflict: conflict
        ? { startAt: conflict.startAt.toISOString(), endAt: conflict.endAt.toISOString() }
        : null,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
