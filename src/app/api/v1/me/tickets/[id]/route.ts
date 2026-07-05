import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { ticketQrPayload } from '@/lib/tickets/tokens';

// Single ticket with the QR payload. Ownership mirrors the web ticket page
// (owner, order owner, buyer email, or admin); non-owned tickets 404 so the
// endpoint never leaks ticket existence. The QR payload is null for statuses
// where the web disables the QR code.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: true,
            address: true,
            city: true,
            coverImage: true,
          },
        },
        ticketType: { select: { name: true } },
        order: { select: { buyerEmail: true, userId: true } },
      },
    });

    const owns =
      ticket &&
      (ticket.ownerUserId === user.id ||
        ticket.order.userId === user.id ||
        ticket.order.buyerEmail.toLowerCase() === user.email.toLowerCase() ||
        user.role === 'admin');
    if (!ticket || !owns) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        status: ticket.status,
        checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
        attendeeName: ticket.attendeeName,
        ticketTypeName: ticket.ticketType.name,
        qrPayload: ticketQrPayload(ticket.status, ticket.token),
        event: {
          id: ticket.event.id,
          title: ticket.event.title,
          startsAt: ticket.event.startsAt.toISOString(),
          venue: ticket.event.venue,
          address: ticket.event.address,
          city: ticket.event.city,
          imageUrl: ticket.event.coverImage,
        },
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
