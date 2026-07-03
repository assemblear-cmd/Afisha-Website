import type { LedgerType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { splitGross } from '@/lib/finance/commission';

// Internal CLP token ledger (1 token = 1 CLP). Every posting carries an
// idempotency key derived from the business entity, so a replayed Stripe
// webhook can never credit a balance twice: `createMany` with
// `skipDuplicates` silently drops rows whose key already exists.
//
// Sign convention: credits positive, debits negative. Balance formulas are
// type-scoped:
//   pendingClp    = Σ(NET_CREDIT + REFUND_DEBIT + ADJUSTMENT) for events not COMPLETED
//   availableClp  = the same Σ for COMPLETED events
//                   + Σ(PAYOUT_HOLD + PAYOUT_RELEASE + PAYOUT_PAID)
//   paidOutClp    = |Σ PAYOUT_PAID|
// A payout lifecycle posts: HOLD −X on request; RELEASE +X on reject/cancel;
// RELEASE +X and PAID −X on mark-paid (the hold converts into a real payout).

export function ledgerKey(scope: 'order' | 'payout', id: string, type: LedgerType): string {
  return `${scope}:${id}:${type}`;
}

const EARNING_TYPES: LedgerType[] = ['ORGANIZER_NET_CREDIT', 'REFUND_DEBIT', 'ADJUSTMENT'];
const PAYOUT_TYPES: LedgerType[] = ['PAYOUT_HOLD', 'PAYOUT_RELEASE', 'PAYOUT_PAID'];

export type TicketSaleLedgerInput = {
  orderId: string;
  organizerId: string;
  eventId: string;
  grossClp: number;
};

/** Posts gross / commission / organizer-net for a paid ticket order. Idempotent. */
export async function postTicketSaleLedger(
  tx: Prisma.TransactionClient,
  input: TicketSaleLedgerInput
): Promise<void> {
  const { grossClp, commissionClp, netClp } = splitGross(input.grossClp);
  if (grossClp <= 0) return;

  await tx.ledgerTransaction.createMany({
    data: [
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orderId: input.orderId,
        type: 'TICKET_SALE_GROSS',
        amountClp: grossClp,
        idempotencyKey: ledgerKey('order', input.orderId, 'TICKET_SALE_GROSS'),
        description: 'Ticket sale gross',
      },
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orderId: input.orderId,
        type: 'PLATFORM_COMMISSION',
        amountClp: -commissionClp,
        idempotencyKey: ledgerKey('order', input.orderId, 'PLATFORM_COMMISSION'),
        description: 'DondeGO platform commission (10%)',
      },
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orderId: input.orderId,
        type: 'ORGANIZER_NET_CREDIT',
        amountClp: netClp,
        idempotencyKey: ledgerKey('order', input.orderId, 'ORGANIZER_NET_CREDIT'),
        description: 'Organizer net revenue (90%)',
      },
    ],
    skipDuplicates: true,
  });
}

/** Debits the organizer net when a paid order is refunded. Idempotent. */
export async function postRefundLedger(
  tx: Prisma.TransactionClient,
  input: TicketSaleLedgerInput
): Promise<void> {
  const { netClp } = splitGross(input.grossClp);
  if (netClp <= 0) return;

  await tx.ledgerTransaction.createMany({
    data: [
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        orderId: input.orderId,
        type: 'REFUND_DEBIT',
        amountClp: -netClp,
        idempotencyKey: ledgerKey('order', input.orderId, 'REFUND_DEBIT'),
        description: 'Refund — organizer net reversed',
      },
    ],
    skipDuplicates: true,
  });
}

export type PayoutLedgerInput = {
  payoutRequestId: string;
  organizerId: string;
  eventId: string;
  amountClp: number;
};

export async function postPayoutHold(tx: Prisma.TransactionClient, input: PayoutLedgerInput) {
  await tx.ledgerTransaction.createMany({
    data: [
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        payoutRequestId: input.payoutRequestId,
        type: 'PAYOUT_HOLD',
        amountClp: -input.amountClp,
        idempotencyKey: ledgerKey('payout', input.payoutRequestId, 'PAYOUT_HOLD'),
        description: 'Payout requested — amount held',
      },
    ],
    skipDuplicates: true,
  });
}

export async function postPayoutRelease(tx: Prisma.TransactionClient, input: PayoutLedgerInput) {
  await tx.ledgerTransaction.createMany({
    data: [
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        payoutRequestId: input.payoutRequestId,
        type: 'PAYOUT_RELEASE',
        amountClp: input.amountClp,
        idempotencyKey: ledgerKey('payout', input.payoutRequestId, 'PAYOUT_RELEASE'),
        description: 'Payout hold released',
      },
    ],
    skipDuplicates: true,
  });
}

export async function postPayoutPaid(tx: Prisma.TransactionClient, input: PayoutLedgerInput) {
  await tx.ledgerTransaction.createMany({
    data: [
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        payoutRequestId: input.payoutRequestId,
        type: 'PAYOUT_RELEASE',
        amountClp: input.amountClp,
        idempotencyKey: ledgerKey('payout', input.payoutRequestId, 'PAYOUT_RELEASE'),
        description: 'Payout hold converted to payout',
      },
      {
        organizerId: input.organizerId,
        eventId: input.eventId,
        payoutRequestId: input.payoutRequestId,
        type: 'PAYOUT_PAID',
        amountClp: -input.amountClp,
        idempotencyKey: ledgerKey('payout', input.payoutRequestId, 'PAYOUT_PAID'),
        description: 'Payout paid to organizer',
      },
    ],
    skipDuplicates: true,
  });
}

export type OrganizerBalances = {
  grossClp: number;
  commissionClp: number;
  netClp: number;
  pendingClp: number;
  availableClp: number;
  paidOutClp: number;
};

/**
 * Derives organizer balances from the ledger. Net revenue for events that are
 * not COMPLETED is "pending"; completed events' net minus payout holds/payouts
 * is "available".
 */
export async function organizerBalances(organizerId: string): Promise<OrganizerBalances> {
  const [byEvent, totals, payoutTotals] = await Promise.all([
    prisma.ledgerTransaction.groupBy({
      by: ['eventId'],
      where: { organizerId, type: { in: EARNING_TYPES } },
      _sum: { amountClp: true },
    }),
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      where: { organizerId, type: { in: ['TICKET_SALE_GROSS', 'PLATFORM_COMMISSION'] } },
      _sum: { amountClp: true },
    }),
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      where: { organizerId, type: { in: PAYOUT_TYPES } },
      _sum: { amountClp: true },
    }),
  ]);

  const eventIds = byEvent.map((row) => row.eventId).filter((id): id is string => id !== null);
  const completed = new Set(
    (
      await prisma.event.findMany({
        where: { id: { in: eventIds }, status: 'COMPLETED' },
        select: { id: true },
      })
    ).map((event) => event.id)
  );

  let pendingClp = 0;
  let completedNetClp = 0;
  for (const row of byEvent) {
    const sum = row._sum.amountClp ?? 0;
    if (row.eventId && completed.has(row.eventId)) completedNetClp += sum;
    else pendingClp += sum;
  }

  const sumOf = (rows: typeof totals, type: string) =>
    rows.find((row) => row.type === type)?._sum.amountClp ?? 0;

  const grossClp = sumOf(totals, 'TICKET_SALE_GROSS');
  const commissionClp = Math.abs(sumOf(totals, 'PLATFORM_COMMISSION'));
  const payoutFlow =
    sumOf(payoutTotals, 'PAYOUT_HOLD') +
    sumOf(payoutTotals, 'PAYOUT_RELEASE') +
    sumOf(payoutTotals, 'PAYOUT_PAID');
  const paidOutClp = Math.abs(sumOf(payoutTotals, 'PAYOUT_PAID'));

  return {
    grossClp,
    commissionClp,
    netClp: pendingClp + completedNetClp,
    pendingClp,
    availableClp: completedNetClp + payoutFlow,
    paidOutClp,
  };
}

export type EventFinance = {
  soldTickets: number;
  checkedInTickets: number;
  grossClp: number;
  commissionClp: number;
  netClp: number;
  paidOutClp: number;
  availableClp: number;
  isCompleted: boolean;
};

/** Per-event financial counter shown to the organizer and admin. */
export async function eventFinance(eventId: string): Promise<EventFinance> {
  const [event, sums, soldTickets, checkedInTickets] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { status: true } }),
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      where: { eventId },
      _sum: { amountClp: true },
    }),
    prisma.ticket.count({ where: { eventId, status: { in: ['ISSUED', 'CHECKED_IN'] } } }),
    prisma.ticket.count({ where: { eventId, status: 'CHECKED_IN' } }),
  ]);

  const sumOf = (type: LedgerType) => sums.find((row) => row.type === type)?._sum.amountClp ?? 0;

  const netClp = EARNING_TYPES.reduce((total, type) => total + sumOf(type), 0);
  const payoutFlow = PAYOUT_TYPES.reduce((total, type) => total + sumOf(type), 0);
  const isCompleted = event?.status === 'COMPLETED';

  return {
    soldTickets,
    checkedInTickets,
    grossClp: sumOf('TICKET_SALE_GROSS'),
    commissionClp: Math.abs(sumOf('PLATFORM_COMMISSION')),
    netClp,
    paidOutClp: Math.abs(sumOf('PAYOUT_PAID')),
    availableClp: isCompleted ? netClp + payoutFlow : 0,
    isCompleted,
  };
}

export type PayoutEligibilityInput = {
  eventStatus: string;
  availableClp: number;
  requestedClp: number;
};

/** Pure payout gate: only COMPLETED events, only up to the available balance. */
export function payoutEligibility(input: PayoutEligibilityInput): { ok: boolean; reason?: string } {
  if (input.eventStatus !== 'COMPLETED') {
    return { ok: false, reason: 'Payouts are available after the event is marked completed.' };
  }
  if (!Number.isInteger(input.requestedClp) || input.requestedClp <= 0) {
    return { ok: false, reason: 'Payout amount must be a positive integer (CLP).' };
  }
  if (input.requestedClp > input.availableClp) {
    return { ok: false, reason: 'Payout amount exceeds the available balance.' };
  }
  return { ok: true };
}
