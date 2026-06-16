import { formatPrice, centsToDollars, dollarsToCents, formatDate, formatTime } from '@/lib/format';

describe('formatPrice', () => {
  it('returns "Free" for 0', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('returns "Free" for negative values', () => {
    expect(formatPrice(-100)).toBe('Free');
    expect(formatPrice(-1)).toBe('Free');
  });

  it('formats 2500 cents as $25.00', () => {
    expect(formatPrice(2500)).toBe('$25.00');
  });

  it('formats 7550 cents as $75.50', () => {
    expect(formatPrice(7550)).toBe('$75.50');
  });

  it('formats 100 cents as $1.00', () => {
    expect(formatPrice(100)).toBe('$1.00');
  });
});

describe('centsToDollars', () => {
  it('converts 100 cents to 1 dollar', () => {
    expect(centsToDollars(100)).toBe(1);
  });

  it('converts 2550 cents to 25.5 dollars', () => {
    expect(centsToDollars(2550)).toBe(25.5);
  });

  it('converts 0 to 0', () => {
    expect(centsToDollars(0)).toBe(0);
  });
});

describe('dollarsToCents', () => {
  it('converts 25.5 dollars to 2550 cents', () => {
    expect(dollarsToCents(25.5)).toBe(2550);
  });

  it('converts 1 dollar to 100 cents', () => {
    expect(dollarsToCents(1)).toBe(100);
  });

  it('converts 0 to 0', () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it('round-trips with centsToDollars', () => {
    expect(dollarsToCents(centsToDollars(1999))).toBe(1999);
    expect(centsToDollars(dollarsToCents(19.99))).toBeCloseTo(19.99);
  });
});

describe('formatDate', () => {
  const isoString = '2025-07-04T18:00:00.000Z';
  const dateObj = new Date(isoString);

  it('accepts a Date object and returns a non-empty string', () => {
    const result = formatDate(dateObj);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts an ISO string and returns a non-empty string', () => {
    const result = formatDate(isoString);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces the same output for equivalent Date and ISO string', () => {
    expect(formatDate(dateObj)).toBe(formatDate(isoString));
  });

  it('includes the year in the output', () => {
    // 2025-07-04 — year 2025 should appear
    const result = formatDate('2025-07-04T12:00:00.000Z');
    expect(result).toContain('2025');
  });
});

describe('formatTime', () => {
  const isoMorning = '2025-07-04T14:30:00.000Z'; // 14:30 UTC
  const dateObj = new Date(isoMorning);

  it('accepts a Date object and returns a non-empty string', () => {
    const result = formatTime(dateObj);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts an ISO string and returns a non-empty string', () => {
    const result = formatTime(isoMorning);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces the same output for equivalent Date and ISO string', () => {
    expect(formatTime(dateObj)).toBe(formatTime(isoMorning));
  });

  it('includes AM or PM (12-hour format)', () => {
    const result = formatTime('2025-07-04T10:00:00.000Z');
    expect(result).toMatch(/AM|PM/i);
  });
});
