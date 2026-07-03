import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { EventStatus, Prisma } from '@prisma/client';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

const FILTERS: Array<{ key: string; label: string; statuses?: EventStatus[] }> = [
  { key: 'created', label: 'Created', statuses: ['DRAFT'] },
  { key: 'review', label: 'In review', statuses: ['SUBMITTED', 'IN_REVIEW', 'APPROVED'] },
  { key: 'published', label: 'Published', statuses: ['PUBLISHED'] },
  { key: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
  { key: 'archived', label: 'Archived', statuses: ['ARCHIVED', 'CANCELLED', 'COMPLETED'] },
  { key: 'all', label: 'All' },
];

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { filter?: string; status?: string };
}) {
  const active =
    FILTERS.find((filter) => filter.key === (searchParams.filter ?? '')) ??
    (searchParams.status ? { key: 'status', label: searchParams.status, statuses: [searchParams.status as EventStatus] } : FILTERS[0]);

  const where: Prisma.EventWhereInput = active.statuses ? { status: { in: active.statuses } } : {};

  const events = await prisma.event.findMany({
    where,
    include: { organizer: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Event moderation</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`/admin/events?filter=${filter.key}`}
            className={
              filter.key === active.key
                ? 'rounded bg-coral px-3 py-1.5 text-sm font-semibold text-white no-underline'
                : 'rounded border border-black/10 px-3 py-1.5 text-sm font-semibold text-body no-underline hover:border-coral dark:border-white/15'
            }
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <Card className="p-8 text-center text-muted">No events in this bucket.</Card>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="block truncate font-semibold text-ink no-underline hover:text-coral"
                >
                  {event.title}
                </Link>
                <p className="text-sm text-muted">
                  {formatDateTime(event.startsAt)} · {event.venue} · by {event.organizer.name} (
                  {event.organizer.email}) · {event.isFree ? 'free' : 'paid'}
                </p>
              </div>
              <StatusBadge status={event.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
