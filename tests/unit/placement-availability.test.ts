import { describe, expect, it } from 'vitest';
import {
  BLOCKING_PLACEMENT_STATUSES,
  findPlacementConflict,
  intervalsOverlap,
} from '@/lib/promotion/availability';

const at = (hour: number) => new Date(Date.UTC(2026, 6, 10, hour));

describe('interval overlap', () => {
  it('detects a partial overlap', () => {
    expect(intervalsOverlap(at(10), at(14), at(12), at(16))).toBe(true);
  });

  it('detects containment', () => {
    expect(intervalsOverlap(at(10), at(20), at(12), at(14))).toBe(true);
  });

  it('treats touching intervals as free (half-open)', () => {
    expect(intervalsOverlap(at(10), at(12), at(12), at(14))).toBe(false);
    expect(intervalsOverlap(at(12), at(14), at(10), at(12))).toBe(false);
  });

  it('rejects identical intervals', () => {
    expect(intervalsOverlap(at(10), at(12), at(10), at(12))).toBe(true);
  });
});

describe('tile slot conflict detection', () => {
  it('conflicts with a LIVE placement covering the requested window', () => {
    const conflict = findPlacementConflict(
      { startAt: at(10), endAt: at(12) },
      [{ startAt: at(9), endAt: at(13), status: 'LIVE' }]
    );
    expect(conflict).not.toBeNull();
  });

  it('conflicts with a pending-payment hold (slot is reserved while paying)', () => {
    const conflict = findPlacementConflict(
      { startAt: at(10), endAt: at(12) },
      [{ startAt: at(11), endAt: at(15), status: 'PENDING_PAYMENT' }]
    );
    expect(conflict).not.toBeNull();
  });

  it('ignores rejected, cancelled, and expired placements', () => {
    const conflict = findPlacementConflict(
      { startAt: at(10), endAt: at(12) },
      [
        { startAt: at(10), endAt: at(12), status: 'REJECTED' },
        { startAt: at(10), endAt: at(12), status: 'CANCELLED' },
        { startAt: at(10), endAt: at(12), status: 'EXPIRED' },
      ]
    );
    expect(conflict).toBeNull();
  });

  it('allows back-to-back bookings', () => {
    const conflict = findPlacementConflict(
      { startAt: at(12), endAt: at(14) },
      [{ startAt: at(10), endAt: at(12), status: 'APPROVED' }]
    );
    expect(conflict).toBeNull();
  });

  it('blocks on every blocking status', () => {
    for (const status of BLOCKING_PLACEMENT_STATUSES) {
      const conflict = findPlacementConflict(
        { startAt: at(10), endAt: at(12) },
        [{ startAt: at(10), endAt: at(12), status }]
      );
      expect(conflict, status).not.toBeNull();
    }
  });
});
