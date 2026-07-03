// DondeGO platform commission on ticket sales.

export const PLATFORM_COMMISSION_PCT = 10;

export type GrossSplit = {
  grossClp: number;
  commissionClp: number;
  netClp: number;
};

/**
 * Splits a gross CLP amount into platform commission (10%) and organizer net
 * (90%). Rounding always preserves gross === commission + net.
 */
export function splitGross(grossClp: number): GrossSplit {
  if (!Number.isInteger(grossClp) || grossClp < 0) {
    throw new Error('Gross amount must be a non-negative integer (CLP).');
  }
  const commissionClp = Math.round((grossClp * PLATFORM_COMMISSION_PCT) / 100);
  return { grossClp, commissionClp, netClp: grossClp - commissionClp };
}
