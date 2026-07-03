import { describe, expect, it } from 'vitest';
import { ledgerKey, payoutEligibility } from '@/lib/finance/ledger';

describe('ledger idempotency keys', () => {
  it('derives a stable key per order and type', () => {
    expect(ledgerKey('order', 'ord_1', 'TICKET_SALE_GROSS')).toBe('order:ord_1:TICKET_SALE_GROSS');
    // The same webhook replayed produces the same key — the unique constraint
    // on idempotencyKey makes the second insert a no-op.
    expect(ledgerKey('order', 'ord_1', 'TICKET_SALE_GROSS')).toBe(
      ledgerKey('order', 'ord_1', 'TICKET_SALE_GROSS')
    );
  });

  it('produces distinct keys across types, entities, and scopes', () => {
    const keys = new Set([
      ledgerKey('order', 'ord_1', 'TICKET_SALE_GROSS'),
      ledgerKey('order', 'ord_1', 'PLATFORM_COMMISSION'),
      ledgerKey('order', 'ord_1', 'ORGANIZER_NET_CREDIT'),
      ledgerKey('order', 'ord_2', 'TICKET_SALE_GROSS'),
      ledgerKey('payout', 'ord_1', 'PAYOUT_HOLD'),
    ]);
    expect(keys.size).toBe(5);
  });
});

describe('payout eligibility', () => {
  it('allows a payout up to the available balance on a completed event', () => {
    expect(
      payoutEligibility({ eventStatus: 'COMPLETED', availableClp: 90000, requestedClp: 90000 })
    ).toEqual({ ok: true });
    expect(
      payoutEligibility({ eventStatus: 'COMPLETED', availableClp: 90000, requestedClp: 50000 }).ok
    ).toBe(true);
  });

  it('rejects payouts before the event is completed', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'CANCELLED']) {
      const result = payoutEligibility({
        eventStatus: status,
        availableClp: 90000,
        requestedClp: 1000,
      });
      expect(result.ok, status).toBe(false);
    }
  });

  it('rejects amounts above the available balance', () => {
    const result = payoutEligibility({
      eventStatus: 'COMPLETED',
      availableClp: 90000,
      requestedClp: 90001,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects zero, negative, and fractional amounts', () => {
    for (const amount of [0, -5, 10.5]) {
      expect(
        payoutEligibility({ eventStatus: 'COMPLETED', availableClp: 90000, requestedClp: amount }).ok
      ).toBe(false);
    }
  });
});
