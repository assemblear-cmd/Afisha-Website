import { NextRequest, NextResponse } from 'next/server';
import type { EventStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireAdmin } from '@/lib/authz';
import { moderationActionSchema } from '@/lib/organizer/validation';

// Admin event moderation. Each action validates the source status, keeps the
// legacy `isPublished` flag in sync with the new status machine, and writes an
// EventModerationLog entry.

type Transition = {
  from: EventStatus[];
  to: EventStatus;
  isPublished?: boolean;
  requiresNotes?: boolean;
};

const TRANSITIONS: Record<string, Transition> = {
  approve: { from: ['SUBMITTED', 'IN_REVIEW', 'APPROVED'], to: 'PUBLISHED', isPublished: true },
  reject: {
    from: ['SUBMITTED', 'IN_REVIEW', 'APPROVED'],
    to: 'REJECTED',
    isPublished: false,
    requiresNotes: true,
  },
  archive: {
    from: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
    to: 'ARCHIVED',
    isPublished: false,
  },
  // COMPLETED gates the payout workflow — organizers can only request a
  // payout for a completed event.
  complete: { from: ['PUBLISHED'], to: 'COMPLETED', isPublished: false },
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    const parsed = moderationActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid moderation action.');
    const { action, notes } = parsed.data;

    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) throw new ApiError(404, 'Event not found.');

    const transition = TRANSITIONS[action];
    if (!transition.from.includes(event.status)) {
      throw new ApiError(400, `Cannot ${action} an event in status ${event.status}.`);
    }
    if (transition.requiresNotes && !notes) {
      throw new ApiError(400, 'A rejection reason is required.');
    }

    await prisma.$transaction([
      prisma.event.update({
        where: { id: event.id },
        data: {
          status: transition.to,
          ...(transition.isPublished !== undefined && { isPublished: transition.isPublished }),
          ...(action === 'approve' && { moderationNotes: null }),
          ...(action === 'reject' && { moderationNotes: notes || null }),
          ...(action === 'complete' && { completedAt: new Date() }),
        },
      }),
      prisma.eventModerationLog.create({
        data: {
          eventId: event.id,
          actorId: admin.id,
          action: transition.to,
          notes: notes || null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: transition.to });
  } catch (error) {
    return errorHandler(error);
  }
}
