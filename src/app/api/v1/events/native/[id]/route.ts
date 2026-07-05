import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';

// Native organizer event detail. Mirrors the /api/events/[id] visibility
// rule (PUBLISHED + isPublished only) and adds mobile-friendly ticket type
// availability. Accepts both the raw cuid and the "event_<id>" wire id.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id.startsWith('event_') ? params.id.slice('event_'.length) : params.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: true,
        organizer: { select: { id: true, name: true } },
      },
    });

    if (!event || event.status !== 'PUBLISHED' || !event.isPublished) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const now = new Date();

    return NextResponse.json({
      event: {
        id: `event_${event.id}`,
        kind: 'native',
        title: event.title,
        shortDescription: event.shortDescription,
        description: event.description,
        category: event.category,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        venueName: event.venue,
        address: event.address,
        city: event.city,
        imageUrl: event.coverImage,
        isFree: event.isFree,
        organizer: { id: event.organizer.id, name: event.organizer.name },
        ticketTypes: event.ticketTypes
          .filter((tt) => tt.status === 'ACTIVE' || tt.status === 'SOLD_OUT')
          .map((tt) => ({
            id: tt.id,
            name: tt.name,
            description: tt.description,
            priceMinor: tt.priceCents,
            currency: tt.currency,
            status: tt.status,
            remaining: Math.max(tt.quantity - tt.sold, 0),
            perOrderLimit: tt.perOrderLimit,
            salesStartAt: tt.salesStartAt?.toISOString() ?? null,
            salesEndAt: tt.salesEndAt?.toISOString() ?? null,
            onSaleNow:
              tt.status === 'ACTIVE' &&
              tt.quantity - tt.sold > 0 &&
              (!tt.salesStartAt || now >= tt.salesStartAt) &&
              (!tt.salesEndAt || now <= tt.salesEndAt),
          })),
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
