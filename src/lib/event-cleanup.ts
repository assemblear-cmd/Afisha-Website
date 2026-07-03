import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const DEFAULT_EVENT_CLEANUP_RETENTION_DAYS = 30;

export type EventCleanupOptions = {
  dryRun?: boolean;
  now?: Date;
  retentionDays?: number;
};

export type EventCleanupResult = {
  cutoff: string;
  dryRun: boolean;
  retentionDays: number;
  shows: {
    matched: number;
    deleted: number;
  };
  organizerEvents: {
    completed: number;
    completedMatched: number;
    deleted: number;
    deleteMatched: number;
  };
};

export function parseRetentionDays(value: string | number | undefined | null): number {
  if (value == null || value === '') return DEFAULT_EVENT_CLEANUP_RETENTION_DAYS;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_EVENT_CLEANUP_RETENTION_DAYS;
  return Math.floor(parsed);
}

export function cleanupCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

function staleShowWhere(cutoff: Date): Prisma.ShowWhereInput {
  return {
    OR: [
      { endsAt: { lt: cutoff } },
      { endsAt: null, startsAt: { lt: cutoff } },
      { startsAt: null, endsAt: null, lastSeenAt: { lt: cutoff } },
    ],
  };
}

function completableOrganizerEventWhere(now: Date): Prisma.EventWhereInput {
  return {
    endsAt: { lt: now },
    status: { in: ['APPROVED', 'PUBLISHED'] },
  };
}

function deletableOrganizerEventWhere(cutoff: Date): Prisma.EventWhereInput {
  return {
    endsAt: { lt: cutoff },
    status: { in: ['DRAFT', 'REJECTED', 'CANCELLED', 'ARCHIVED'] },
    ticketTypes: { every: { sold: 0 } },
    orders: { none: {} },
    tickets: { none: {} },
    ticketScans: { none: {} },
    placements: { none: {} },
    promotionOrders: { none: {} },
    ledgerEntries: { none: {} },
    payoutRequests: { none: {} },
  };
}

export async function runEventCleanup(options: EventCleanupOptions = {}): Promise<EventCleanupResult> {
  const now = options.now ?? new Date();
  const retentionDays = parseRetentionDays(
    options.retentionDays ?? process.env.EVENT_CLEANUP_RETENTION_DAYS
  );
  const cutoff = cleanupCutoff(now, retentionDays);
  const dryRun = options.dryRun ?? false;
  const showWhere = staleShowWhere(cutoff);
  const completeWhere = completableOrganizerEventWhere(now);
  const deleteEventWhere = deletableOrganizerEventWhere(cutoff);

  const [matchedShows, completedMatched, deleteMatched] = await Promise.all([
    prisma.show.count({ where: showWhere }),
    prisma.event.count({ where: completeWhere }),
    prisma.event.count({ where: deleteEventWhere }),
  ]);

  if (dryRun) {
    return {
      cutoff: cutoff.toISOString(),
      dryRun,
      retentionDays,
      shows: { matched: matchedShows, deleted: 0 },
      organizerEvents: {
        completed: 0,
        completedMatched,
        deleted: 0,
        deleteMatched,
      },
    };
  }

  const [deletedShows, completedEvents, deletedEvents] = await prisma.$transaction([
    prisma.show.deleteMany({ where: showWhere }),
    prisma.event.updateMany({
      where: completeWhere,
      data: {
        status: 'COMPLETED',
        isPublished: false,
        completedAt: now,
      },
    }),
    prisma.event.deleteMany({ where: deleteEventWhere }),
  ]);

  return {
    cutoff: cutoff.toISOString(),
    dryRun,
    retentionDays,
    shows: {
      matched: matchedShows,
      deleted: deletedShows.count,
    },
    organizerEvents: {
      completed: completedEvents.count,
      completedMatched,
      deleted: deletedEvents.count,
      deleteMatched,
    },
  };
}
