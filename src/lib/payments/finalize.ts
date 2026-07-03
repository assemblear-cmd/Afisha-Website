import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postRefundLedger, postTicketSaleLedger } from '@/lib/finance/ledger';
import { generateTicketToken } from '@/lib/tickets/tokens';

// Webhook-driven finalization. Everything here is idempotent: the webhook
// route dedupes Stripe event ids first, payments already PAID short-circuit,
// order-status transitions use guarded updateMany, ticket issuance checks for
// existing tickets, and ledger postings dedupe on idempotency keys.

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true; event: { select: { id: true; organizerId: true } } };
}>;

/** Creates one Ticket row per purchased seat. No-op if tickets already exist. */
export async function issueTicketsForOrder(
  tx: Prisma.TransactionClient,
  order: OrderWithItems
): Promise<number> {
  const existing = await tx.ticket.count({ where: { orderId: order.id } });
  if (existing > 0) return 0;

  const tickets = order.items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => ({
      token: generateTicketToken(),
      orderId: order.id,
      orderItemId: item.id,
      eventId: order.eventId,
      ticketTypeId: item.ticketTypeId,
      ownerUserId: order.userId,
      attendeeName: order.buyerName,
      attendeeEmail: order.buyerEmail,
    }))
  );
  if (tickets.length > 0) {
    await tx.ticket.createMany({ data: tickets });
  }
  return tickets.length;
}

async function releaseOrderInventory(tx: Prisma.TransactionClient, order: OrderWithItems) {
  for (const item of order.items) {
    await tx.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { sold: { decrement: item.quantity } },
    });
  }
}

async function loadPaymentBySession(sessionId: string) {
  return prisma.payment.findUnique({
    where: { providerSessionId: sessionId },
    include: {
      order: { include: { items: true, event: { select: { id: true, organizerId: true } } } },
      promotionOrder: {
        include: { items: { include: { placement: true, promoService: true } } },
      },
    },
  });
}

/** checkout.session.completed → confirm payment, issue tickets, post ledger. */
export async function handleSessionCompleted(sessionId: string, paymentIntentId: string | null) {
  const payment = await loadPaymentBySession(sessionId);
  if (!payment || payment.status === 'PAID') return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', providerPaymentIntentId: paymentIntentId },
    });

    if (payment.kind === 'TICKET_ORDER' && payment.order) {
      const order = payment.order;
      await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      await issueTicketsForOrder(tx, order);
      if (order.currency === 'CLP') {
        await postTicketSaleLedger(tx, {
          orderId: order.id,
          organizerId: order.event.organizerId,
          eventId: order.eventId,
          grossClp: order.totalCents,
        });
      }
    }

    if (payment.kind === 'PROMOTION_ORDER' && payment.promotionOrder) {
      const promo = payment.promotionOrder;
      // Paid promotion goes to admin moderation.
      await tx.promotionOrder.update({
        where: { id: promo.id },
        data: { status: 'PENDING_REVIEW' },
      });
      await tx.promotionOrderItem.updateMany({
        where: { orderId: promo.id, status: 'PENDING_PAYMENT' },
        data: { status: 'PENDING_REVIEW' },
      });
      for (const item of promo.items) {
        if (item.placement) {
          await tx.homepageTilePlacement.updateMany({
            where: { id: item.placement.id, status: 'PENDING_PAYMENT' },
            data: { status: 'PENDING_REVIEW' },
          });
        }
        // The scanner add-on activates immediately on payment; admins can
        // still mark the request FULFILLED for bookkeeping.
        if (item.promoService?.code === 'scanner_addon') {
          await tx.event.update({
            where: { id: promo.eventId },
            data: { scannerAddonPaid: true },
          });
        }
      }
    }
  });
}

/** checkout.session.expired / async_payment_failed → cancel the pending order
 *  and free inventory/slots. */
export async function handleSessionExpired(
  sessionId: string,
  paymentStatus: 'CANCELLED' | 'FAILED' = 'CANCELLED'
) {
  const payment = await loadPaymentBySession(sessionId);
  if (!payment || payment.status !== 'PENDING') return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus } });

    if (payment.kind === 'TICKET_ORDER' && payment.order) {
      const cancelled = await tx.order.updateMany({
        where: { id: payment.order.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count > 0) {
        await releaseOrderInventory(tx, payment.order);
      }
    }

    if (payment.kind === 'PROMOTION_ORDER' && payment.promotionOrder) {
      const promo = payment.promotionOrder;
      await tx.promotionOrder.updateMany({
        where: { id: promo.id, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED' },
      });
      await tx.promotionOrderItem.updateMany({
        where: { orderId: promo.id, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED' },
      });
      await tx.homepageTilePlacement.updateMany({
        where: {
          id: { in: promo.items.map((item) => item.placementId).filter((id): id is string => !!id) },
          status: 'PENDING_PAYMENT',
        },
        data: { status: 'EXPIRED' },
      });
    }
  });
}

/** charge.refunded → mark payment/order/tickets refunded and reverse net credit. */
export async function handleChargeRefunded(paymentIntentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentIntentId: paymentIntentId },
    include: {
      order: { include: { items: true, event: { select: { id: true, organizerId: true } } } },
    },
  });
  if (!payment || payment.status === 'REFUNDED') return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });

    if (payment.kind === 'TICKET_ORDER' && payment.order) {
      const order = payment.order;
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: { in: ['PAID', 'paid'] } },
        data: { status: 'REFUNDED' },
      });
      if (changed.count > 0) {
        await tx.ticket.updateMany({
          where: { orderId: order.id, status: { in: ['ISSUED', 'CHECKED_IN'] } },
          data: { status: 'REFUNDED' },
        });
        await releaseOrderInventory(tx, order);
        if (order.currency === 'CLP') {
          await postRefundLedger(tx, {
            orderId: order.id,
            organizerId: order.event.organizerId,
            eventId: order.eventId,
            grossClp: order.totalCents,
          });
        }
      }
    }
  });
}
