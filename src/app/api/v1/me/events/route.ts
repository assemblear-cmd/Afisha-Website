import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { formatListingPrice } from '@/lib/format';
import type { MobileEventSummary } from '@/lib/mobile/events';

// Events the current user organizes (any status), newest first — powers the
// "My events" section of the mobile Events tab. Tapping one opens the public
// event page, where the owner also gets an "enter as organizer" action.

export async function GET() {
  try {
    const user = await requireUser();
    const events = await prisma.event.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, startsAt: true, venue: true, category: true,
        coverImage: true, isFree: true,
        ticketTypes: {
          where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
          select: { priceCents: true, currency: true },
        },
      },
    });

    const items: MobileEventSummary[] = events.map((e) => {
      const cheapest = [...e.ticketTypes].sort((a, b) => a.priceCents - b.priceCents)[0];
      return {
        id: `event_${e.id}`,
        kind: 'native',
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        venueName: e.venue,
        imageUrl: e.coverImage,
        categories: [e.category],
        sourceUrl: null,
        priceText: e.isFree ? null : cheapest ? formatListingPrice(cheapest.priceCents, cheapest.currency) : null,
        priceMinor: null,
        minPriceMinor: cheapest ? cheapest.priceCents : null,
        currency: cheapest?.currency ?? 'CLP',
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return errorHandler(error);
  }
}
