import Link from 'next/link';
import type { TicketType } from '@prisma/client';
import type { Event } from '@/types';
import { Card, Badge, CoverPlaceholder } from '@/components/ui';
import { categoryLabel, categoryEmoji } from '@/lib/categories';
import { formatDate, formatTime } from '@/lib/format';
import { formatTicketPrice } from '@/lib/money';

interface EventCardProps {
  event: Event & { ticketTypes: TicketType[] };
}

export function EventCard({ event }: EventCardProps) {
  const { id, title, category, venue, city, startsAt, coverImage, ticketTypes } = event;

  const cheapestTicket =
    ticketTypes.length > 0
      ? [...ticketTypes].sort((a, b) => a.priceCents - b.priceCents)[0]
      : null;

  return (
    <Link href={`/events/${id}`} className="block min-w-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-xl">
      <Card className="h-full min-w-0 flex flex-col transition-transform duration-200 group-hover:-translate-y-1">
        {/* Cover image */}
        <div className="aspect-[16/9] w-full overflow-hidden relative">
          <CoverPlaceholder seed={id} glyph={categoryEmoji(category)} />
          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={title}
              className="absolute inset-0 z-10 h-full w-full object-cover"
            />
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 p-4 flex flex-col flex-1 gap-1">
          <Badge tone="coral">{categoryLabel(category)}</Badge>

          <p className="text-coral text-sm font-semibold mt-1">
            {formatDate(startsAt)} · {formatTime(startsAt)}
          </p>

          <h3 className="font-semibold text-ink line-clamp-2 mt-1 leading-snug">
            {title}
          </h3>

          <p className="text-muted text-sm">
            {venue} · {city}
          </p>

          {/* Footer price */}
          <div className="mt-auto pt-3">
            {!cheapestTicket || cheapestTicket.priceCents <= 0 ? (
              <span className="text-sm font-medium text-success">Free</span>
            ) : (
              <span className="text-sm font-medium text-ink">
                From {formatTicketPrice(cheapestTicket.priceCents, cheapestTicket.currency)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
