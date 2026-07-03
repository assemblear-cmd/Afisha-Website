import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireAdmin } from '@/lib/authz';
import { ticketAdminActionSchema } from '@/lib/organizer/validation';

// Admin ticket controls: invalidate (fraud/abuse) or cancel a ticket. Both
// make the QR scan fail from that moment on.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const parsed = ticketAdminActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid action.');

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) throw new ApiError(404, 'Ticket not found.');
    if (!['ISSUED', 'CHECKED_IN'].includes(ticket.status)) {
      throw new ApiError(400, `Ticket in status ${ticket.status} cannot be changed.`);
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: parsed.data.action === 'invalidate' ? 'INVALIDATED' : 'CANCELLED' },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
