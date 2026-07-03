import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { ticketTypeUpdateSchema } from '@/lib/organizer/validation';
import { isEventEditable } from '@/lib/event-status';

function parseOptionalDate(value: string | undefined, label: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new ApiError(400, `Invalid ${label}.`);
  return date;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();

    const ticketType = await prisma.ticketType.findUnique({ where: { id: params.id } });
    if (!ticketType) throw new ApiError(404, 'Ticket type not found.');
    const event = await requireEventOwnership(ticketType.eventId, user);
    if (!isEventEditable(event.status)) {
      throw new ApiError(400, `Tickets for events in status ${event.status} cannot be edited.`);
    }

    const parsed = ticketTypeUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Validation error.');
    }
    const data = parsed.data;

    if (data.price !== undefined && event.isFree && data.price > 0) {
      throw new ApiError(400, 'Free events can only have tickets priced 0.');
    }
    if (data.quantity !== undefined && data.quantity < ticketType.sold) {
      throw new ApiError(400, `Quantity cannot go below ${ticketType.sold} already sold.`);
    }

    const updated = await prisma.ticketType.update({
      where: { id: ticketType.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.price !== undefined && { priceCents: data.price }),
        ...(data.currency !== undefined && { currency: data.currency.toUpperCase() }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.perOrderLimit !== undefined && { perOrderLimit: data.perOrderLimit ?? null }),
        ...(data.salesStartAt !== undefined && {
          salesStartAt: parseOptionalDate(data.salesStartAt, 'sales start'),
        }),
        ...(data.salesEndAt !== undefined && {
          salesEndAt: parseOptionalDate(data.salesEndAt, 'sales end'),
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return NextResponse.json({ ticketType: { id: updated.id, status: updated.status } });
  } catch (error) {
    return errorHandler(error);
  }
}
