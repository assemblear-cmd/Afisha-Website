import { describe, expect, it } from 'vitest';
import {
  DISCOUNT_TIERS,
  HOURS_PER_WEEK,
  MAX_PLACEMENT_HOURS,
  discountPctForHours,
  quoteTilePlacement,
} from '@/lib/promotion/pricing';

describe('homepage tile pricing', () => {
  it('charges the plain hourly rate for 1 hour', () => {
    const quote = quoteTilePlacement(10000, 1);
    expect(quote).toMatchObject({
      basePriceClp: 10000,
      discountPct: 0,
      totalPriceClp: 10000,
    });
  });

  it('applies 10% discount at 12 hours', () => {
    const quote = quoteTilePlacement(10000, 12);
    expect(quote.discountPct).toBe(10);
    expect(quote.basePriceClp).toBe(120000);
    expect(quote.totalPriceClp).toBe(108000);
  });

  it('applies 15% discount at 24 hours', () => {
    const quote = quoteTilePlacement(10000, 24);
    expect(quote.discountPct).toBe(15);
    expect(quote.totalPriceClp).toBe(204000);
  });

  it('applies 25% discount at 48 hours', () => {
    const quote = quoteTilePlacement(10000, 48);
    expect(quote.discountPct).toBe(25);
    expect(quote.totalPriceClp).toBe(360000);
  });

  it('applies 40% discount at 1 week', () => {
    const quote = quoteTilePlacement(10000, HOURS_PER_WEEK);
    expect(quote.discountPct).toBe(40);
    expect(quote.basePriceClp).toBe(1680000);
    expect(quote.totalPriceClp).toBe(1008000);
  });

  it('keeps tier boundaries exclusive below the threshold', () => {
    expect(discountPctForHours(11)).toBe(0);
    expect(discountPctForHours(23)).toBe(10);
    expect(discountPctForHours(47)).toBe(15);
    expect(discountPctForHours(167)).toBe(25);
    expect(discountPctForHours(HOURS_PER_WEEK)).toBe(40);
  });

  it('rounds discounted totals to whole pesos', () => {
    // 3333 * 12 = 39996; −10% = 35996.4 → 35996
    expect(quoteTilePlacement(3333, 12).totalPriceClp).toBe(35996);
  });

  it('rejects non-integer, zero, negative, and out-of-range durations', () => {
    expect(() => quoteTilePlacement(10000, 0)).toThrow();
    expect(() => quoteTilePlacement(10000, 1.5)).toThrow();
    expect(() => quoteTilePlacement(10000, MAX_PLACEMENT_HOURS + 1)).toThrow();
    expect(() => quoteTilePlacement(0, 5)).toThrow();
    expect(() => quoteTilePlacement(-100, 5)).toThrow();
  });

  it('keeps the discount tiers sorted longest-first (first match wins)', () => {
    const hours = DISCOUNT_TIERS.map((tier) => tier.minHours);
    expect([...hours].sort((a, b) => b - a)).toEqual(hours);
  });
});
