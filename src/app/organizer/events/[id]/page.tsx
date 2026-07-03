import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { isEventEditable } from '@/lib/event-status';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { SubmitEventButton } from '@/components/organizer/SubmitEventButton';
import { EventForm } from '@/components/organizer/EventForm';

export const dynamic = 'force-dynamic';

const SUB_NAV = [
  { suffix: 'tickets', label: 'Tickets' },
  { suffix: 'promotion', label: 'Promotion' },
  { suffix: 'access', label: 'Scanner access' },
  { suffix: 'finance', label: 'Finance' },
];

export default async function OrganizerEventPage({ params }: { params: { id: string } }) {
  const user = (await getCurrentUser())!;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { ticketTypes: true },
  });
  if (!event || (!isAdmin(user) && event.organizerId !== user.id)) notFound();

  const editable = isEventEditable(event.status);
  const sold = event.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-ink">{event.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDateTime(event.startsAt)} · {event.venue} · {event.isFree ? 'Free event' : 'Paid event'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={event.status} />
          {editable && <SubmitEventButton eventId={event.id} />}
        </div>
      </div>

      {event.status === 'REJECTED' && event.moderationNotes && (
        <Card className="border border-red-300 p-4 text-sm dark:border-red-800">
          <p className="font-semibold text-ink">Rejected by moderation</p>
          <p className="mt-1 text-body">{event.moderationNotes}</p>
          <p className="mt-1 text-muted">Fix the issues and submit again.</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {SUB_NAV.map((item) => (
          <Link
            key={item.suffix}
            href={`/organizer/events/${event.id}/${item.suffix}`}
            className="rounded border border-black/10 px-3 py-1.5 text-sm font-semibold text-body no-underline transition hover:border-coral hover:text-coral dark:border-white/15"
          >
            {item.label}
          </Link>
        ))}
        {event.status === 'PUBLISHED' && (
          <Link
            href={`/events/${event.id}`}
            className="rounded border border-black/10 px-3 py-1.5 text-sm font-semibold text-body no-underline transition hover:border-coral hover:text-coral dark:border-white/15"
          >
            Public page ↗
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{event.ticketTypes.length}</p>
          <p className="text-xs text-muted">Ticket types</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">{sold}</p>
          <p className="text-xs text-muted">Tickets sold</p>
        </Card>
        <Card className="p-4">
          <p className="text-lg font-bold text-ink">
            {event.isFree ? (event.scannerAddonPaid ? 'Add-on active' : 'Add-on required') : 'Included'}
          </p>
          <p className="text-xs text-muted">Scanner</p>
        </Card>
      </div>

      {editable ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Edit event</h2>
          <EventForm
            mode="edit"
            eventId={event.id}
            initial={{
              title: event.title,
              shortDescription: event.shortDescription ?? '',
              description: event.description,
              category: event.category,
              venue: event.venue,
              address: event.address,
              city: event.city,
              startsAt: event.startsAt.toISOString().slice(0, 16),
              endsAt: event.endsAt.toISOString().slice(0, 16),
              eventType: event.isFree ? 'free' : 'paid',
              coverImage: event.coverImage,
              contactName: event.contactName ?? '',
              contactEmail: event.contactEmail ?? '',
              contactPhone: event.contactPhone ?? '',
            }}
          />
        </section>
      ) : (
        <Card className="p-4 text-sm text-muted">
          Editing is locked after the event is sent to moderation.
        </Card>
      )}
    </div>
  );
}
