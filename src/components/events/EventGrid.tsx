import type { TicketType } from '@prisma/client';
import type { Event } from '@/types';
import { EventCard } from './EventCard';

interface EventGridProps {
  events: (Event & { ticketTypes: TicketType[] })[];
}

export function EventGrid({ events }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-xl font-semibold text-ink">No events match your search yet.</p>
        <p className="text-muted text-sm mt-2">
          Try adjusting your filters or check back soon — new events are added all the time.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
