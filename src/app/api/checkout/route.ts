import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ApiError, errorHandler } from '@/lib/api-error';
import { ticketCheckoutSchema } from '@/lib/organizer/validation';
import { issueTicketsForOrder } from '@/lib/payments/finalize';
import { createStripeCheckoutSession, getAppUrl } from '@/lib/payments/stripe';

// New checkout for organizer-module events. Free orders (total 0) are issued
// immediately without Stripe; paid orders create a PENDING order + Payment and
// redirect to Stripe Checkout. Prices always come from DB rows, and the order
// only becomes PAID when the webhook confirms it.

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = ticketCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation error.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { eventId, buyerName, buyerEmail, items } = parsed.data;

  const activeItems = items.filter((item) => item.quantity > 0);
  if (activeItems.length === 0) {
    return NextResponse.json({ error: 'Select at least one ticket.' }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, status: true, isPublished: true, isFree: true, organizerId: true },
    });
    if (!event) throw new ApiError(404, 'Event not found.');
    if (event.status !== 'PUBLISHED' || !event.isPublished) {
      throw new ApiError(400, 'This event is not open for ticket sales.');
    }

    const ticketTypeIds = activeItems.map((item) => item.ticketTypeId);
    const now = new Date();
    const currentUser = await getCurrentUser();

    const order = await prisma.$transaction(async (tx) => {
      const ticketTypes = await tx.ticketType.findMany({
        where: { id: { in: ticketTypeIds }, eventId },
      });
      if (ticketTypes.length !== ticketTypeIds.length) {
        throw new ApiError(400, 'One or more ticket types are invalid.');
      }

      const currencies = new Set(ticketTypes.map((tt) => tt.currency));
      if (currencies.size > 1) {
        throw new ApiError(400, 'Mixed-currency orders are not supported.');
      }
      const currency = ticketTypes[0]?.currency ?? 'CLP';

      for (const item of activeItems) {
        const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
        if (tt.status !== 'ACTIVE') {
          throw new ApiError(400, `"${tt.name}" is not on sale.`);
        }
        if (tt.salesStartAt && now < tt.salesStartAt) {
          throw new ApiError(400, `"${tt.name}" sales have not started yet.`);
        }
        if (tt.salesEndAt && now > tt.salesEndAt) {
          throw new ApiError(400, `"${tt.name}" sales have ended.`);
        }
        if (tt.perOrderLimit && item.quantity > tt.perOrderLimit) {
          throw new ApiError(400, `"${tt.name}" is limited to ${tt.perOrderLimit} per order.`);
        }
        const remaining = tt.quantity - tt.sold;
        if (item.quantity > remaining) {
          throw new ApiError(400, `"${tt.name}" only has ${remaining} tickets left.`);
        }
      }

      const totalCents = activeItems.reduce((sum, item) => {
        const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
        return sum + tt.priceCents * item.quantity;
      }, 0);
      const isFreeOrder = totalCents === 0;

      const created = await tx.order.create({
        data: {
          buyerName,
          buyerEmail,
          totalCents,
          currency,
          status: isFreeOrder ? 'PAID' : 'PENDING',
          eventId,
          userId: currentUser?.id ?? null,
          items: {
            create: activeItems.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
              unitPriceCents: ticketTypes.find((t) => t.id === item.ticketTypeId)!.priceCents,
            })),
          },
        },
        include: { items: true, event: { select: { id: true, organizerId: true } } },
      });

      // Reserve inventory for PENDING orders; released on expiry/failure.
      for (const item of activeItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { sold: { increment: item.quantity } },
        });
      }

      if (isFreeOrder) {
        await issueTicketsForOrder(tx, created);
      }

      return created;
    });

    if (order.status === 'PAID') {
      // Free order — tickets already issued, no Stripe involved.
      return NextResponse.json({ orderId: order.id, free: true }, { status: 201 });
    }

    const payment = await prisma.payment.create({
      data: {
        kind: 'TICKET_ORDER',
        orderId: order.id,
        amountCents: order.totalCents,
        currency: order.currency,
      },
    });

    try {
      const appUrl = getAppUrl();
      const session = await createStripeCheckoutSession({
        paymentId: payment.id,
        customerEmail: buyerEmail,
        lineItems: order.items.map((item) => ({
          name: event.title,
          unitAmountMinor: item.unitPriceCents,
          currency: order.currency,
          quantity: item.quantity,
        })),
        successUrl: `${appUrl}/checkout/result?order=${order.id}&outcome=success`,
        cancelUrl: `${appUrl}/checkout/result?order=${order.id}&outcome=cancelled`,
        metadata: { kind: 'TICKET_ORDER', orderId: order.id, eventId },
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerSessionId: session.id },
      });
      return NextResponse.json({ orderId: order.id, url: session.url }, { status: 201 });
    } catch (stripeError) {
      // Roll the reservation back so a failed session start never strands seats.
      await prisma.$transaction(async (tx) => {
        const cancelled = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        if (cancelled.count > 0) {
          for (const item of order.items) {
            await tx.ticketType.update({
              where: { id: item.ticketTypeId },
              data: { sold: { decrement: item.quantity } },
            });
          }
        }
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
