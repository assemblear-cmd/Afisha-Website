// Homepage tile pricing. Base unit is 1 hour in CLP; longer bookings earn a
// duration discount. Tile hourly prices live in the HomepageTile table
// (seeded in prisma/commerceDefaults.ts) so admins can edit them; the tier
// percentages below are business constants covered by unit tests.

export const HOURS_PER_WEEK = 7 * 24;

// Ordered longest-first; the first tier the duration reaches wins.
export const DISCOUNT_TIERS: ReadonlyArray<{ minHours: number; pct: number }> = [
  { minHours: HOURS_PER_WEEK, pct: 40 },
  { minHours: 48, pct: 25 },
  { minHours: 24, pct: 15 },
  { minHours: 12, pct: 10 },
];

export const MIN_PLACEMENT_HOURS = 1;
// Cap a single booking at 4 weeks to keep the calendar liquid.
export const MAX_PLACEMENT_HOURS = 4 * HOURS_PER_WEEK;

export function discountPctForHours(hours: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (hours >= tier.minHours) return tier.pct;
  }
  return 0;
}

export type TileQuote = {
  hours: number;
  hourlyPriceClp: number;
  basePriceClp: number;
  discountPct: number;
  totalPriceClp: number;
};

export function quoteTilePlacement(hourlyPriceClp: number, hours: number): TileQuote {
  if (!Number.isInteger(hours) || hours < MIN_PLACEMENT_HOURS || hours > MAX_PLACEMENT_HOURS) {
    throw new Error(
      `Placement duration must be an integer between ${MIN_PLACEMENT_HOURS} and ${MAX_PLACEMENT_HOURS} hours.`
    );
  }
  if (!Number.isInteger(hourlyPriceClp) || hourlyPriceClp <= 0) {
    throw new Error('Tile hourly price must be a positive integer (CLP).');
  }
  const basePriceClp = hourlyPriceClp * hours;
  const discountPct = discountPctForHours(hours);
  const totalPriceClp = Math.round((basePriceClp * (100 - discountPct)) / 100);
  return { hours, hourlyPriceClp, basePriceClp, discountPct, totalPriceClp };
}
