import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { getSavedItems } from '@/lib/likes';
import { Card, LinkButton } from '@/components/ui';
import { LikeButton } from '@/components/likes/LikeButton';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function OrganizerEventsPage() {
  const user = (await getCurrentUser())!;

  const [events, saved] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: user.id },
      include: {
        ticketTypes: { select: { quantity: true, sold: true } },
        _count: { select: { tickets: { where: { status: 'CHECKED_IN' } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getSavedItems(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Your events</h1>
        <LinkButton href="/organizer/events/new" variant="primary" size="sm">
          Create event
        </LinkButton>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          You haven&apos;t created any events yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const sold = event.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0);
            const capacity = event.ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0);
            return (
              <Card key={event.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="block truncate font-semibold text-ink no-underline hover:text-coral"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatDateTime(event.startsAt)} · {event.venue}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <span className="text-muted">
                      {sold}/{capacity} sold · {event._count.tickets} checked in
                    </span>
                    <StatusBadge status={event.status} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Liked (heart) events — native and aggregated — newest like first. */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl font-bold text-ink">Saved</h2>
        {saved.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            You haven&apos;t saved any events yet. Tap the heart on an event to keep it here.
          </Card>
        ) : (
          <div className="space-y-3">
            {saved.map((item) => (
              <Card key={item.key} className="p-4">
                <div className="flex items-center gap-4">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded bg-surface" />
                  )}
                  <div className="min-w-0 flex-1">
                    {item.href ? (
                      <a
                        href={item.href}
                        {...(item.kind === 'scraped' && item.href.startsWith('http')
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                        className="block truncate font-semibold text-ink no-underline hover:text-coral"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <p className="truncate font-semibold text-ink">{item.title}</p>
                    )}
                    <p className="mt-0.5 text-sm text-muted">
                      {item.startsAt ? formatDateTime(item.startsAt) : 'Date TBA'}
                      {item.venueName ? ` · ${item.venueName}` : ''}
                    </p>
                  </div>
                  <LikeButton
                    targetKey={item.key}
                    initialLiked
                    signedIn
                    tone="ink"
                    className="shrink-0"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
