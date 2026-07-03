import clsx from 'clsx';
import { eventStatusLabel, type EventStatusLabelLocale } from '@/lib/event-status';

// Compact status chip shared by the organizer and admin sections. Tones are
// grouped by meaning so every new enum value lands on something sensible.

const SUCCESS = ['PUBLISHED', 'PAID', 'ACTIVE', 'VALID', 'FULFILLED', 'LIVE', 'CHECKED_IN'];
const WARN = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'PENDING',
  'PENDING_PAYMENT',
  'PENDING_REVIEW',
  'REQUESTED',
  'HELD',
  'INVITED',
  'PROCESSING',
  'REQUIRES_ACTION',
  'ISSUED',
];
const DANGER = [
  'REJECTED',
  'CANCELLED',
  'FAILED',
  'REVOKED',
  'INVALIDATED',
  'EXPIRED',
  'NO_ACCESS',
  'REFUNDED',
  'ALREADY_USED',
  'EVENT_MISMATCH',
  'INVALID',
  'SOLD_OUT',
];

export function StatusBadge({ status, locale = 'en' }: { status: string; locale?: EventStatusLabelLocale }) {
  const tone = SUCCESS.includes(status)
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : WARN.includes(status)
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : DANGER.includes(status)
        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <span
      className={clsx(
        'inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        tone
      )}
    >
      {eventStatusLabel(status, locale) ?? status.replace(/_/g, ' ')}
    </span>
  );
}
