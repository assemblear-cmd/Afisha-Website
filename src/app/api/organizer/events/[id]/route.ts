import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { organizerEventSchema } from '@/lib/organizer/validation';
import { isEventEditable } from '@/lib/event-status';

// Organizer edits are only allowed while the event is DRAFT or REJECTED;
// anything after submission is admin territory.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();
    const event = await requireEventOwnership(params.id, user);

    if (!isEventEditable(event.status)) {
      throw new ApiError(400, `Events in status ${event.status} cannot be edited.`);
    }

    const parsed = organizerEventSchema.partial().safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Validation error.');
    }
    const data = parsed.data;

    const startsAt = data.startsAt ? new Date(data.startsAt) : event.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : event.endsAt;
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new ApiError(400, 'End date must be after start date.');
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.shortDescription !== undefined && {
          shortDescription: data.shortDescription || null,
        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.venue !== undefined && { venue: data.venue }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        startsAt,
        endsAt,
        ...(data.coverImage !== undefined && data.coverImage !== '' && {
          coverImage: data.coverImage,
        }),
        ...(data.eventType !== undefined && { isFree: data.eventType === 'free' }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
      },
    });

    return NextResponse.json({ event: { id: updated.id, status: updated.status } });
  } catch (error) {
    return errorHandler(error);
  }
}
