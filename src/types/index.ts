import type { Event, TicketType, User, Order, OrderItem } from '@prisma/client';

export type EventWithTickets = Event & {
  ticketTypes: TicketType[];
  organizer: Pick<User, 'id' | 'name'>;
};

export type { Event, TicketType, User, Order, OrderItem };
