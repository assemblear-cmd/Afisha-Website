import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const DEFAULT_EVENT_CLEANUP_RETENTION_DAYS = 0;
export const UNDATED_SHOW_RETENTION_DAYS = 30;

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

function staleShowWhere(cutoff: Date, undatedCutoff: Date): Prisma.ShowWhereInput {
  return {
    OR: [
      { endsAt: { lt: cutoff } },
      { endsAt: null, startsAt: { lt: cutoff } },
      { startsAt: null, endsAt: null, lastSeenAt: { lt: undatedCutoff } },
    ],
  };
}

function completableOrganizerEventWhere(now: Date): Prisma.EventWhereInput {
  return {
    endsAt: { lt: now },
    status: { in: ['APPROVED', 'PUBLISHED'] },
  };
}

export async function runEventCleanup(options: EventCleanupOptions = {}): Promise<EventCleanupResult> {
  const now = options.now ?? new Date();
  const retentionDays = parseRetentionDays(
    options.retentionDays ?? process.env.EVENT_CLEANUP_RETENTION_DAYS
  );
  const cutoff = cleanupCutoff(now, retentionDays);
  const undatedCutoff = cleanupCutoff(now, Math.max(retentionDays, UNDATED_SHOW_RETENTION_DAYS));
  const dryRun = options.dryRun ?? false;
  const showWhere = staleShowWhere(cutoff, undatedCutoff);
  const completeWhere = completableOrganizerEventWhere(now);

  const [matchedShows, completedMatched] = await Promise.all([
    prisma.show.count({ where: showWhere }),
    prisma.event.count({ where: completeWhere }),
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
      },
    };
  }

  const [deletedShows, completedEvents] = await prisma.$transaction([
    prisma.show.deleteMany({ where: showWhere }),
    prisma.event.updateMany({
      where: completeWhere,
      data: {
        status: 'COMPLETED',
        isPublished: false,
        completedAt: now,
      },
    }),
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
    },
  };
}
