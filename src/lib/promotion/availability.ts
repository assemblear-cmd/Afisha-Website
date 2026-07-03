import type { PlacementStatus, Prisma } from '@prisma/client';

// Placement statuses that block another booking of the same tile for an
// overlapping interval. REJECTED / EXPIRED / CANCELLED slots become free again.
export const BLOCKING_PLACEMENT_STATUSES: PlacementStatus[] = [
  'HELD',
  'PENDING_PAYMENT',
  'PAID',
  'PENDING_REVIEW',
  'APPROVED',
  'LIVE',
];

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type ExistingPlacement = {
  startAt: Date;
  endAt: Date;
  status: PlacementStatus;
};

/**
 * Pure conflict check used by tests and by the transactional booking path:
 * a requested interval conflicts if any blocking-status placement overlaps it.
 */
export function findPlacementConflict(
  requested: { startAt: Date; endAt: Date },
  existing: ExistingPlacement[]
): ExistingPlacement | null {
  for (const placement of existing) {
    if (!BLOCKING_PLACEMENT_STATUSES.includes(placement.status)) continue;
    if (intervalsOverlap(requested.startAt, requested.endAt, placement.startAt, placement.endAt)) {
      return placement;
    }
  }
  return null;
}

/**
 * DB-side conflict check. Callers that book a slot must run this inside a
 * transaction that first locks the tile row (SELECT ... FOR UPDATE) so two
 * concurrent bookings of the same tile serialize.
 */
export async function tileConflictExists(
  tx: Prisma.TransactionClient,
  tileId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflict = await tx.homepageTilePlacement.findFirst({
    where: {
      tileId,
      status: { in: BLOCKING_PLACEMENT_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  return conflict !== null;
}
