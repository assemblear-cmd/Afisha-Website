import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { Card, Container, LinkButton } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My events' };

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  if (user.role !== 'organizer') {
    return (
      <Container className="py-16 max-w-lg text-center">
        <Card className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-ink">Organizer access required</h1>
          <p className="text-body">
            Your account is a visitor account. Register an organizer account to create events.
          </p>
          <LinkButton href="/register" variant="primary">
            Register as organizer
          </LinkButton>
        </Card>
      </Container>
    );
  }

  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    include: {
      ticketTypes: true,
      _count: { select: { orders: true } },
    },
    orderBy: { startsAt: 'asc' },
  });

  const totalCapacity = (ttypes: { quantity: number }[]) =>
    ttypes.reduce((sum, t) => sum + t.quantity, 0);

  const totalSold = (ttypes: { sold: number }[]) =>
    ttypes.reduce((sum, t) => sum + t.sold, 0);

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-ink">My events</h1>
        <LinkButton href="/dashboard/events/new" variant="primary">
          Create event
        </LinkButton>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <p className="text-muted text-lg">You haven&apos;t created any events yet.</p>
          <LinkButton href="/dashboard/events/new" variant="primary">
            Create event
          </LinkButton>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const capacity = totalCapacity(event.ticketTypes);
            const sold = totalSold(event.ticketTypes);
            const pct = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;

            return (
              <Card key={event.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="font-semibold text-ink hover:text-coral transition truncate block"
                    >
                      {event.title}
                    </Link>
                    <p className="text-sm text-muted mt-0.5">
                      {formatDateTime(event.startsAt)} · {event.city}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-semibold text-ink">{capacity}</p>
                      <p className="text-muted">Capacity</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-ink">{sold}</p>
                      <p className="text-muted">Sold</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-ink">{event._count.orders}</p>
                      <p className="text-muted">Orders</p>
                    </div>
                    <StatusBadge status={event.status} />
                    <span className="text-muted">{pct}% sold</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
