import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isEventEditable, isEventPublished } from '@/lib/event-status';
import { formatDateTime } from '@/lib/format';
import { formatTicketPrice } from '@/lib/money';
import { Card, Container, LinkButton } from '@/components/ui';
import { EventForm } from '@/components/organizer/EventForm';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { SubmitEventButton } from '@/components/organizer/SubmitEventButton';
import { TicketTypeManager } from '@/components/organizer/TicketTypeManager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Event dashboard' };

interface EventDashboardPageProps {
  params: { id: string };
}

function totalCapacity(ticketTypes: { quantity: number }[]) {
  return ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
}

function totalSold(ticketTypes: { sold: number }[]) {
  return ticketTypes.reduce((sum, ticket) => sum + ticket.sold, 0);
}

export default async function EventDashboardPage({ params }: EventDashboardPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/events/${params.id}`);
  }

  if (user.role !== 'organizer') {
    return (
      <Container className="py-16 max-w-lg text-center">
        <Card className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-ink">Organizer access required</h1>
          <p className="text-body">
            Your account is a visitor account. Register an organizer account to manage events.
          </p>
          <LinkButton href="/register" variant="primary">
            Register as organizer
          </LinkButton>
        </Card>
      </Container>
    );
  }

  const event = await prisma.event.findFirst({
    where: { id: params.id, organizerId: user.id },
    include: {
      ticketTypes: { orderBy: { name: 'asc' } },
      _count: { select: { orders: true } },
    },
  });

  if (!event) {
    notFound();
  }

  const capacity = totalCapacity(event.ticketTypes);
  const sold = totalSold(event.ticketTypes);
  const soldPct = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
  const editable = isEventEditable(event.status);
  const published = isEventPublished(event);

  return (
    <Container className="py-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm font-semibold text-coral no-underline hover:text-coral-dark">
            ← My events
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-ink">{event.title}</h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-muted">{formatDateTime(event.startsAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {editable && <SubmitEventButton eventId={event.id} />}
          {published && (
            <LinkButton href={`/events/${event.id}`} variant="secondary">
              View public page
            </LinkButton>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.9fr)]">
        <Card>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImage} alt="" className="aspect-video w-full object-cover" />
          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-coral">Dashboard</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Event details</h2>
            </div>
            <p className="whitespace-pre-line text-body">{event.description}</p>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-ink">Starts</p>
                <p className="text-muted">{formatDateTime(event.startsAt)}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Ends</p>
                <p className="text-muted">{formatDateTime(event.endsAt)}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Category</p>
                <p className="text-muted">{event.category}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Venue</p>
                <p className="text-muted">{event.venue}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold text-ink">Address</p>
                <p className="text-muted">
                  {event.address}, {event.city}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink">Sales summary</h2>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface p-4">
                <p className="text-2xl font-bold text-ink">{capacity}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Capacity</p>
              </div>
              <div className="rounded-lg bg-surface p-4">
                <p className="text-2xl font-bold text-ink">{sold}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Sold</p>
              </div>
              <div className="rounded-lg bg-surface p-4">
                <p className="text-2xl font-bold text-ink">{event._count.orders}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">Orders</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(soldPct, 100)}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-muted">{soldPct}% sold</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink">Tickets</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {event.ticketTypes.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-ink">{ticket.name}</p>
                    <p className="text-sm text-muted">
                      {ticket.sold} of {ticket.quantity} sold
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-ink">
                    {formatTicketPrice(ticket.priceCents, ticket.currency)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {editable ? (
          <>
            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Edit event</h2>
              <Card className="p-5">
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
                    contactName: event.contactName ?? user.name,
                    contactEmail: event.contactEmail ?? user.email,
                    contactPhone: event.contactPhone ?? '',
                  }}
                />
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-ink">Tickets</h2>
              <TicketTypeManager
                eventId={event.id}
                isFree={event.isFree}
                editable={editable}
                ticketTypes={event.ticketTypes.map((ticket) => ({
                  id: ticket.id,
                  name: ticket.name,
                  description: ticket.description ?? '',
                  price: ticket.priceCents,
                  currency: ticket.currency,
                  quantity: ticket.quantity,
                  sold: ticket.sold,
                  perOrderLimit: ticket.perOrderLimit,
                  salesStartAt: ticket.salesStartAt ? ticket.salesStartAt.toISOString().slice(0, 16) : '',
                  salesEndAt: ticket.salesEndAt ? ticket.salesEndAt.toISOString().slice(0, 16) : '',
                  status: ticket.status,
                }))}
              />
            </section>
          </>
        ) : (
          <Card className="p-5 text-sm text-muted">
            Editing is locked after the event is sent to moderation.
          </Card>
        )}
      </div>
    </Container>
  );
}
