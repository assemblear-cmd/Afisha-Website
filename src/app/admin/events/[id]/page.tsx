import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { eventFinance } from '@/lib/finance/ledger';
import { formatMoney, formatTicketPrice } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { ModerationActions } from '@/components/admin/ModerationActions';

export const dynamic = 'force-dynamic';

export default async function AdminEventDetailPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      organizer: { select: { name: true, email: true } },
      ticketTypes: true,
      moderationLogs: {
        include: { actor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!event) notFound();

  const finance = await eventFinance(event.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{event.title}</h1>
        <StatusBadge status={event.status} />
      </div>

      <Card className="space-y-2 p-5 text-sm">
        <p className="text-body">
          <span className="font-semibold text-ink">When:</span> {formatDateTime(event.startsAt)} →{' '}
          {formatDateTime(event.endsAt)}
        </p>
        <p className="text-body">
          <span className="font-semibold text-ink">Where:</span> {event.venue}, {event.address},{' '}
          {event.city}
        </p>
        <p className="text-body">
          <span className="font-semibold text-ink">Type:</span> {event.isFree ? 'Free' : 'Paid'}
          {event.isFree && ` · scanner add-on ${event.scannerAddonPaid ? 'active' : 'not purchased'}`}
        </p>
        <p className="text-body">
          <span className="font-semibold text-ink">Organizer:</span> {event.organizer.name} (
          {event.organizer.email})
        </p>
        <p className="text-body">
          <span className="font-semibold text-ink">Contact:</span>{' '}
          {event.contactName ?? '—'} · {event.contactEmail ?? '—'} · {event.contactPhone ?? '—'}
        </p>
        <p className="whitespace-pre-line text-body">
          <span className="font-semibold text-ink">Description:</span> {event.description}
        </p>
        {event.moderationNotes && (
          <p className="text-body">
            <span className="font-semibold text-ink">Moderation notes:</span> {event.moderationNotes}
          </p>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Moderation</h2>
        <ModerationActions eventId={event.id} status={event.status} />
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{finance.soldTickets}</p>
          <p className="text-xs text-muted">Sold</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{finance.checkedInTickets}</p>
          <p className="text-xs text-muted">Checked in</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(finance.grossClp)}</p>
          <p className="text-xs text-muted">Gross</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{formatMoney(finance.commissionClp)}</p>
          <p className="text-xs text-muted">Commission</p>
        </Card>
      </div>

      {event.ticketTypes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Ticket types</h2>
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
            {event.ticketTypes.map((tt) => (
              <div key={tt.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="text-body">
                  {tt.name} · {formatTicketPrice(tt.priceCents, tt.currency)} · {tt.sold}/{tt.quantity}
                </span>
                <StatusBadge status={tt.status} />
              </div>
            ))}
          </Card>
        </section>
      )}

      {event.moderationLogs.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Moderation history</h2>
          <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
            {event.moderationLogs.map((log) => (
              <div key={log.id} className="p-3 text-sm">
                <p className="font-semibold text-ink">
                  {log.action} <span className="font-normal text-muted">by {log.actor.email}</span>
                </p>
                <p className="text-xs text-muted">{formatDateTime(log.createdAt)}</p>
                {log.notes && <p className="mt-1 text-body">{log.notes}</p>}
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
