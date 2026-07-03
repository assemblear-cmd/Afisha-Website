import type { ScanResult, TicketStatus } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canScanEvent, scannerEnabledForEvent } from '@/lib/authz';
import { extractToken } from '@/lib/tickets/tokens';

export type ScanDecisionInput = {
  ticketStatus: TicketStatus | null;
  ticketEventId: string | null;
  expectedEventId: string;
};

/**
 * Pure verification decision, unit-tested in isolation. The DB path applies
 * an atomic status transition on top of it to close the double-scan race.
 */
export function decideScan(input: ScanDecisionInput): ScanResult {
  if (input.ticketStatus === null || input.ticketEventId === null) return 'INVALID';
  if (input.ticketEventId !== input.expectedEventId) return 'EVENT_MISMATCH';
  switch (input.ticketStatus) {
    case 'ISSUED':
      return 'VALID';
    case 'CHECKED_IN':
      return 'ALREADY_USED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'INVALIDATED':
      return 'INVALID';
  }
}

export const SCAN_MESSAGES: Record<ScanResult, string> = {
  VALID: 'Ticket is valid. Checked in.',
  ALREADY_USED: 'Ticket was already checked in.',
  INVALID: 'Ticket not found or invalidated.',
  CANCELLED: 'Ticket was cancelled.',
  REFUNDED: 'Ticket was refunded.',
  EXPIRED: 'Ticket has expired.',
  EVENT_MISMATCH: 'Ticket belongs to a different event.',
  NO_ACCESS: 'You do not have scanner access for this event.',
};

export type ScanOutcome = {
  result: ScanResult;
  message: string;
  ticket?: {
    id: string;
    attendeeName: string | null;
    ticketTypeName: string;
    eventTitle: string;
    checkedInAt: string | null;
  };
};

export type PerformScanInput = {
  eventId: string;
  rawValue: string;
  deviceInfo?: string;
};

/**
 * Full server-side scan: access check, token lookup, atomic check-in, and a
 * TicketScan history row for every attempt (including NO_ACCESS and INVALID).
 */
export async function performScan(user: SessionUser, input: PerformScanInput): Promise<ScanOutcome> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, title: true, isFree: true, scannerAddonPaid: true, organizerId: true },
  });
  if (!event) return { result: 'INVALID', message: 'Event not found.' };

  const record = (result: ScanResult, ticketId: string | null, notes?: string) =>
    prisma.ticketScan.create({
      data: {
        ticketId,
        eventId: event.id,
        scannedById: user.id,
        result,
        deviceInfo: input.deviceInfo?.slice(0, 255),
        notes,
      },
    });

  const { allowed } = await canScanEvent(user, event.id);
  if (!allowed) {
    await record('NO_ACCESS', null);
    return { result: 'NO_ACCESS', message: SCAN_MESSAGES.NO_ACCESS };
  }

  if (!scannerEnabledForEvent(event)) {
    // Free event without the paid scanner add-on: the flow is disabled, and
    // the UI explains how to enable it. Recorded as NO_ACCESS in history.
    await record('NO_ACCESS', null, 'Scanner add-on not purchased for free event');
    return {
      result: 'NO_ACCESS',
      message:
        'Scanning is disabled for this free event. Purchase the scanner add-on (CLP 20,000) under Promotion to enable check-in.',
    };
  }

  const token = extractToken(input.rawValue);
  if (!token) {
    await record('INVALID', null, 'Unparseable QR/token input');
    return { result: 'INVALID', message: SCAN_MESSAGES.INVALID };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    include: { ticketType: { select: { name: true } }, event: { select: { title: true } } },
  });

  let result = decideScan({
    ticketStatus: ticket?.status ?? null,
    ticketEventId: ticket?.eventId ?? null,
    expectedEventId: event.id,
  });

  let checkedInAt: Date | null = ticket?.checkedInAt ?? null;

  if (result === 'VALID' && ticket) {
    // Atomic transition guards the double-scan race: only one concurrent scan
    // can move ISSUED -> CHECKED_IN; the loser reports ALREADY_USED.
    checkedInAt = new Date();
    const updated = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'ISSUED' },
      data: { status: 'CHECKED_IN', checkedInAt },
    });
    if (updated.count === 0) result = 'ALREADY_USED';
  }

  await record(result, ticket?.id ?? null);

  return {
    result,
    message: SCAN_MESSAGES[result],
    ticket: ticket
      ? {
          id: ticket.id,
          attendeeName: ticket.attendeeName,
          ticketTypeName: ticket.ticketType.name,
          eventTitle: ticket.event.title,
          checkedInAt: checkedInAt ? checkedInAt.toISOString() : null,
        }
      : undefined,
  };
}
