import Link from 'next/link';
import type { TicketType } from '@prisma/client';
import type { Event } from '@/types';
import { Card, Badge, CoverPlaceholder } from '@/components/ui';
import { categoryLabel, categoryEmoji } from '@/lib/categories';
import { formatDate, formatTime, formatPrice } from '@/lib/format';

interface EventCardProps {
  event: Event & { ticketTypes: TicketType[] };
}

export function EventCard({ event }: EventCardProps) {
  const { id, title, category, venue, city, startsAt, coverImage, ticketTypes } = event;

  const minPrice =
    ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((t) => t.priceCents))
      : 0;

  return (
    <Link href={`/events/${id}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-xl">
      <Card className="h-full flex flex-col transition-transform duration-200 group-hover:-translate-y-1">
        {/* Cover image */}
        <div className="aspect-[16/9] w-full overflow-hidden relative">
          <CoverPlaceholder seed={id} glyph={categoryEmoji(category)} />
          {coverImage && (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover relative z-10"
            />
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1 gap-1">
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
            {minPrice <= 0 ? (
              <span className="text-sm font-medium text-success">Free</span>
            ) : (
              <span className="text-sm font-medium text-ink">
                From {formatPrice(minPrice)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
