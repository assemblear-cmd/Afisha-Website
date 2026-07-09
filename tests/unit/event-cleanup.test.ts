import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EVENT_CLEANUP_RETENTION_DAYS,
  UNDATED_SHOW_RETENTION_DAYS,
  cleanupCutoff,
  completableOrganizerEventWhere,
  parseRetentionDays,
  staleShowWhere,
} from '@/lib/event-cleanup';

const NOW = new Date('2026-07-08T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('parseRetentionDays', () => {
  it('defaults to 0 days (delete the day after the event ends)', () => {
    expect(DEFAULT_EVENT_CLEANUP_RETENTION_DAYS).toBe(0);
    expect(parseRetentionDays(undefined)).toBe(0);
    expect(parseRetentionDays(null)).toBe(0);
    expect(parseRetentionDays('')).toBe(0);
  });

  it('accepts whole non-negative day counts', () => {
    expect(parseRetentionDays('3')).toBe(3);
    expect(parseRetentionDays(7)).toBe(7);
    expect(parseRetentionDays('2.9')).toBe(2);
  });

  it('falls back to the default for garbage input', () => {
    expect(parseRetentionDays('-1')).toBe(0);
    expect(parseRetentionDays('abc')).toBe(0);
    expect(parseRetentionDays(Number.NaN)).toBe(0);
    expect(parseRetentionDays(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('cleanupCutoff', () => {
  it('is "now" with zero retention, so anything already finished is stale', () => {
    expect(cleanupCutoff(NOW, 0).getTime()).toBe(NOW.getTime());
  });

  it('moves back one day per retention day', () => {
    expect(cleanupCutoff(NOW, 1).getTime()).toBe(NOW.getTime() - DAY_MS);
    expect(cleanupCutoff(NOW, 30).getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
  });
});

describe('staleShowWhere (scraped shows — the only rows ever deleted)', () => {
  const cutoff = cleanupCutoff(NOW, 0);
  const undatedCutoff = cleanupCutoff(NOW, UNDATED_SHOW_RETENTION_DAYS);
  const where = staleShowWhere(cutoff, undatedCutoff);

  it('targets shows that finished before the cutoff', () => {
    expect(where.OR).toContainEqual({ endsAt: { lt: cutoff } });
  });

  it('falls back to startsAt when the show has no end date', () => {
    expect(where.OR).toContainEqual({ endsAt: null, startsAt: { lt: cutoff } });
  });

  it('keeps undated shows for a 30-day last-seen grace period', () => {
    expect(UNDATED_SHOW_RETENTION_DAYS).toBe(30);
    expect(where.OR).toContainEqual({
      startsAt: null,
      endsAt: null,
      lastSeenAt: { lt: undatedCutoff },
    });
  });

  it('never matches upcoming or still-running shows', () => {
    // Each OR branch requires a timestamp strictly before the cutoff (= now),
    // so a show with endsAt/startsAt in the future can never satisfy any of
    // them — the where clause has no branch without a `lt` bound.
    for (const branch of where.OR ?? []) {
      const bounds = [branch.endsAt, branch.startsAt, branch.lastSeenAt].filter(
        (bound): bound is { lt: Date } => typeof bound === 'object' && bound !== null && 'lt' in bound
      );
      expect(bounds.length).toBeGreaterThan(0);
      for (const bound of bounds) expect(bound.lt.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });
});

describe('completableOrganizerEventWhere (user-organized events are preserved)', () => {
  const where = completableOrganizerEventWhere(NOW);

  it('only touches events that already ended', () => {
    expect(where.endsAt).toEqual({ lt: NOW });
  });

  it('only flips live statuses, leaving drafts/rejected/archived history alone', () => {
    expect(where.status).toEqual({ in: ['APPROVED', 'PUBLISHED'] });
  });
});
