import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';

// Sends a DRAFT (or fixed-up REJECTED) event to admin moderation.

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();
    const event = await requireEventOwnership(params.id, user);

    if (!['DRAFT', 'REJECTED'].includes(event.status)) {
      throw new ApiError(400, `Events in status ${event.status} cannot be submitted.`);
    }

    if (!event.isFree) {
      const sellable = await prisma.ticketType.count({
        where: { eventId: event.id, status: { in: ['ACTIVE', 'DRAFT'] } },
      });
      if (sellable === 0) {
        throw new ApiError(400, 'Add at least one ticket type before submitting a paid event.');
      }
    }

    await prisma.$transaction([
      prisma.event.update({
        where: { id: event.id },
        data: { status: 'IN_REVIEW', isPublished: false, moderationNotes: null },
      }),
      prisma.eventModerationLog.create({
        data: { eventId: event.id, actorId: user.id, action: 'IN_REVIEW' },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
