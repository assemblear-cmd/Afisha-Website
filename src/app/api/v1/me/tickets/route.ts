import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { parsePagination } from '@/lib/mobile/events';

// "My tickets" list. Ownership matches the web account page: ticket owner,
// order owner, or buyer-email match (guest purchases picked up after
// registration). Tokens are never included in list responses — the QR
// payload only ships from the single-ticket endpoint.

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    const scope = params.get('scope') ?? 'upcoming';
    if (!['upcoming', 'past', 'all'].includes(scope)) {
      return NextResponse.json({ error: 'scope must be upcoming, past, or all.' }, { status: 400 });
    }
    const { page, pageSize } = parsePagination(params);

    const now = new Date();
    const where: Prisma.TicketWhereInput = {
      OR: [
        { ownerUserId: user.id },
        { order: { userId: user.id } },
        { order: { buyerEmail: { equals: user.email, mode: 'insensitive' } } },
      ],
      ...(scope === 'upcoming' ? { event: { startsAt: { gte: now } } } : {}),
      ...(scope === 'past' ? { event: { startsAt: { lt: now } } } : {}),
    };

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          event: {
            select: { id: true, title: true, startsAt: true, venue: true, city: true, coverImage: true },
          },
          ticketType: { select: { name: true } },
        },
        orderBy: { event: { startsAt: scope === 'past' ? 'desc' : 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      items: tickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status,
        checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
        ticketTypeName: ticket.ticketType.name,
        event: {
          id: ticket.event.id,
          title: ticket.event.title,
          startsAt: ticket.event.startsAt.toISOString(),
          venue: ticket.event.venue,
          city: ticket.event.city,
          imageUrl: ticket.event.coverImage,
        },
      })),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
