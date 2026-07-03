import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { ticketTypeCreateSchema } from '@/lib/organizer/validation';
import { isEventEditable } from '@/lib/event-status';

function parseOptionalDate(value: string | undefined, label: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new ApiError(400, `Invalid ${label}.`);
  return date;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();
    const event = await requireEventOwnership(params.id, user);
    if (!isEventEditable(event.status)) {
      throw new ApiError(400, `Tickets for events in status ${event.status} cannot be edited.`);
    }

    const parsed = ticketTypeCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Validation error.');
    }
    const data = parsed.data;

    if (event.isFree && data.price > 0) {
      throw new ApiError(400, 'Free events can only have tickets priced 0.');
    }

    const salesStartAt = parseOptionalDate(data.salesStartAt, 'sales start');
    const salesEndAt = parseOptionalDate(data.salesEndAt, 'sales end');
    if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
      throw new ApiError(400, 'Sales end must be after sales start.');
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: data.name,
        description: data.description || null,
        priceCents: data.price,
        currency: data.currency.toUpperCase(),
        quantity: data.quantity,
        perOrderLimit: data.perOrderLimit ?? null,
        salesStartAt,
        salesEndAt,
        status: data.status,
      },
    });

    return NextResponse.json({ ticketType: { id: ticketType.id } }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
