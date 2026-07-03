import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { isEventEditable } from '@/lib/event-status';
import { TicketTypeManager } from '@/components/organizer/TicketTypeManager';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function OrganizerTicketsPage({ params }: { params: { id: string } }) {
  const user = (await getCurrentUser())!;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { ticketTypes: { orderBy: { id: 'asc' } } },
  });
  if (!event || (!isAdmin(user) && event.organizerId !== user.id)) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Tickets — {event.title}</h1>
        <StatusBadge status={event.status} />
      </div>

      {event.isFree && (
        <p className="text-sm text-muted">
          This is a free event: all ticket types must be priced 0. Attendees still get QR tickets;
          check-in scanning requires the paid scanner add-on (see Promotion).
        </p>
      )}

      <TicketTypeManager
        eventId={event.id}
        isFree={event.isFree}
        editable={isEventEditable(event.status)}
        ticketTypes={event.ticketTypes.map((tt) => ({
          id: tt.id,
          name: tt.name,
          description: tt.description ?? '',
          price: tt.priceCents,
          currency: tt.currency,
          quantity: tt.quantity,
          sold: tt.sold,
          perOrderLimit: tt.perOrderLimit,
          salesStartAt: tt.salesStartAt ? tt.salesStartAt.toISOString().slice(0, 16) : '',
          salesEndAt: tt.salesEndAt ? tt.salesEndAt.toISOString().slice(0, 16) : '',
          status: tt.status,
        }))}
      />
    </div>
  );
}
