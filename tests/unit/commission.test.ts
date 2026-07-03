import { describe, expect, it } from 'vitest';
import { PLATFORM_COMMISSION_PCT, splitGross } from '@/lib/finance/commission';

describe('DondeGO commission split', () => {
  it('is 10%', () => {
    expect(PLATFORM_COMMISSION_PCT).toBe(10);
  });

  it('splits a round amount 10/90', () => {
    expect(splitGross(100000)).toEqual({
      grossClp: 100000,
      commissionClp: 10000,
      netClp: 90000,
    });
  });

  it('always preserves gross = commission + net under rounding', () => {
    for (const gross of [1, 5, 99, 12345, 33333, 999999, 15005]) {
      const split = splitGross(gross);
      expect(split.commissionClp + split.netClp).toBe(gross);
      expect(split.commissionClp).toBe(Math.round(gross * 0.1));
    }
  });

  it('handles zero gross (free orders post nothing)', () => {
    expect(splitGross(0)).toEqual({ grossClp: 0, commissionClp: 0, netClp: 0 });
  });

  it('rejects negative or fractional amounts', () => {
    expect(() => splitGross(-1)).toThrow();
    expect(() => splitGross(10.5)).toThrow();
  });
});
