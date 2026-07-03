import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { promotionCheckoutSchema } from '@/lib/organizer/validation';
import { quoteTilePlacement } from '@/lib/promotion/pricing';
import { tileConflictExists } from '@/lib/promotion/availability';
import { createStripeCheckoutSession, getAppUrl, type CheckoutLineItem } from '@/lib/payments/stripe';

// One promotion order can combine a homepage tile placement and promo
// services (Instagram post/story, Telegram repost, scanner add-on) in a
// single Stripe Checkout. Slot conflicts are rejected inside a transaction
// that locks the tile row, so two organizers can't buy the same hours.

function assertHourAligned(date: Date) {
  if (date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
    throw new ApiError(400, 'Placements start on whole hours.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizer();

    const parsed = promotionCheckoutSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid promotion request.');
    }
    const { eventId, tile, serviceCodes } = parsed.data;

    if (!tile && serviceCodes.length === 0) {
      throw new ApiError(400, 'Select a homepage tile or at least one promo service.');
    }

    const event = await requireEventOwnership(eventId, user);
    if (event.status !== 'PUBLISHED' || !event.isPublished) {
      throw new ApiError(400, 'Promotion is available after the event is published.');
    }

    const services = await prisma.promoService.findMany({
      where: { code: { in: serviceCodes }, isActive: true },
    });
    if (services.length !== new Set(serviceCodes).size) {
      throw new ApiError(400, 'One or more promo services are unavailable.');
    }
    const scannerAddon = services.find((service) => service.code === 'scanner_addon');
    if (scannerAddon) {
      if (!event.isFree) {
        throw new ApiError(400, 'The scanner add-on applies to free events only.');
      }
      if (event.scannerAddonPaid) {
        throw new ApiError(400, 'The scanner add-on is already active for this event.');
      }
    }

    let placementInput: {
      tileId: string;
      tileName: string;
      startAt: Date;
      endAt: Date;
      quote: ReturnType<typeof quoteTilePlacement>;
    } | null = null;

    if (tile) {
      const startAt = new Date(tile.startAt);
      if (isNaN(startAt.getTime())) throw new ApiError(400, 'Invalid placement start date.');
      assertHourAligned(startAt);
      if (startAt.getTime() < Date.now() - 60 * 60 * 1000) {
        throw new ApiError(400, 'Placement start must be in the future.');
      }
      const tileRow = await prisma.homepageTile.findUnique({ where: { id: tile.tileId } });
      if (!tileRow || !tileRow.isActive) throw new ApiError(404, 'Tile not found.');
      const quote = quoteTilePlacement(tileRow.hourlyPriceClp, tile.hours);
      placementInput = {
        tileId: tileRow.id,
        tileName: tileRow.name,
        startAt,
        endAt: new Date(startAt.getTime() + tile.hours * 60 * 60 * 1000),
        quote,
      };
    }

    const totalClp =
      (placementInput?.quote.totalPriceClp ?? 0) +
      services.reduce((sum, service) => sum + service.priceClp, 0);
    if (totalClp <= 0) throw new ApiError(400, 'Promotion total must be positive.');

    const { promoOrder, lineItems } = await prisma.$transaction(async (tx) => {
      let placementId: string | null = null;

      if (placementInput) {
        // Lock the tile row so concurrent bookings of the same tile serialize,
        // then re-check for overlap before creating the placement.
        await tx.$queryRaw`SELECT id FROM "HomepageTile" WHERE id = ${placementInput.tileId} FOR UPDATE`;
        const conflict = await tileConflictExists(
          tx,
          placementInput.tileId,
          placementInput.startAt,
          placementInput.endAt
        );
        if (conflict) {
          throw new ApiError(409, 'This tile is already booked for an overlapping period.');
        }
        const placement = await tx.homepageTilePlacement.create({
          data: {
            tileId: placementInput.tileId,
            eventId: event.id,
            organizerId: user.id,
            startAt: placementInput.startAt,
            endAt: placementInput.endAt,
            hours: placementInput.quote.hours,
            basePriceClp: placementInput.quote.basePriceClp,
            discountPct: placementInput.quote.discountPct,
            totalPriceClp: placementInput.quote.totalPriceClp,
            status: 'PENDING_PAYMENT',
          },
        });
        placementId = placement.id;
      }

      const itemsData: Prisma.PromotionOrderItemCreateWithoutOrderInput[] = [];
      if (placementInput && placementId) {
        itemsData.push({
          kind: 'TILE_PLACEMENT',
          placement: { connect: { id: placementId } },
          unitPriceClp: placementInput.quote.totalPriceClp,
        });
      }
      for (const service of services) {
        itemsData.push({
          kind: 'PROMO_SERVICE',
          promoService: { connect: { id: service.id } },
          unitPriceClp: service.priceClp,
        });
      }

      const created = await tx.promotionOrder.create({
        data: {
          organizerId: user.id,
          eventId: event.id,
          totalClp,
          items: { create: itemsData },
        },
      });

      const items: CheckoutLineItem[] = [];
      if (placementInput) {
        items.push({
          name: `${placementInput.tileName} — ${placementInput.quote.hours}h homepage placement`,
          unitAmountMinor: placementInput.quote.totalPriceClp,
          currency: 'CLP',
          quantity: 1,
        });
      }
      for (const service of services) {
        items.push({
          name: service.name,
          unitAmountMinor: service.priceClp,
          currency: 'CLP',
          quantity: 1,
        });
      }

      return { promoOrder: created, lineItems: items };
    });

    const payment = await prisma.payment.create({
      data: {
        kind: 'PROMOTION_ORDER',
        promotionOrderId: promoOrder.id,
        amountCents: totalClp,
        currency: 'CLP',
      },
    });

    try {
      const appUrl = getAppUrl();
      const session = await createStripeCheckoutSession({
        paymentId: payment.id,
        customerEmail: user.email,
        lineItems,
        successUrl: `${appUrl}/organizer/events/${event.id}/promotion?outcome=success`,
        cancelUrl: `${appUrl}/organizer/events/${event.id}/promotion?outcome=cancelled`,
        metadata: { kind: 'PROMOTION_ORDER', promotionOrderId: promoOrder.id, eventId: event.id },
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerSessionId: session.id },
      });
      return NextResponse.json({ promotionOrderId: promoOrder.id, url: session.url }, { status: 201 });
    } catch (stripeError) {
      await prisma.$transaction(async (tx) => {
        await tx.promotionOrder.update({ where: { id: promoOrder.id }, data: { status: 'CANCELLED' } });
        await tx.promotionOrderItem.updateMany({
          where: { orderId: promoOrder.id },
          data: { status: 'CANCELLED' },
        });
        await tx.homepageTilePlacement.updateMany({
          where: { orderItem: { orderId: promoOrder.id } },
          data: { status: 'CANCELLED' },
        });
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      });
      if (stripeError instanceof ApiError) throw stripeError;
      console.error('Stripe session creation failed:', stripeError);
      throw new ApiError(502, 'Could not start the payment. Please try again.');
    }
  } catch (error) {
    return errorHandler(error);
  }
}
