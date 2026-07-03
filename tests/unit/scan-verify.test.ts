import { describe, expect, it } from 'vitest';
import { decideScan } from '@/lib/tickets/verify';

const EVENT = 'event-a';
const OTHER_EVENT = 'event-b';

describe('scan decision', () => {
  it('accepts an issued ticket for the right event', () => {
    expect(
      decideScan({ ticketStatus: 'ISSUED', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('VALID');
  });

  it('rejects an unknown token', () => {
    expect(
      decideScan({ ticketStatus: null, ticketEventId: null, expectedEventId: EVENT })
    ).toBe('INVALID');
  });

  it('reports already-used tickets', () => {
    expect(
      decideScan({ ticketStatus: 'CHECKED_IN', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('ALREADY_USED');
  });

  it('detects event mismatch before status', () => {
    expect(
      decideScan({ ticketStatus: 'ISSUED', ticketEventId: OTHER_EVENT, expectedEventId: EVENT })
    ).toBe('EVENT_MISMATCH');
    expect(
      decideScan({ ticketStatus: 'CHECKED_IN', ticketEventId: OTHER_EVENT, expectedEventId: EVENT })
    ).toBe('EVENT_MISMATCH');
  });

  it('maps terminal ticket statuses to their scan results', () => {
    expect(
      decideScan({ ticketStatus: 'CANCELLED', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('CANCELLED');
    expect(
      decideScan({ ticketStatus: 'REFUNDED', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('REFUNDED');
    expect(
      decideScan({ ticketStatus: 'EXPIRED', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('EXPIRED');
    expect(
      decideScan({ ticketStatus: 'INVALIDATED', ticketEventId: EVENT, expectedEventId: EVENT })
    ).toBe('INVALID');
  });
});
