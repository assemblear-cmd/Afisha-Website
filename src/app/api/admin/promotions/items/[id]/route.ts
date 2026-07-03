import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireAdmin } from '@/lib/authz';
import { promoItemActionSchema } from '@/lib/organizer/validation';

// Admin moderation of paid promotion items (tile placements and promo
// services): approve / reject / mark fulfilled. Approving a tile placement
// makes it LIVE immediately if its window has already started.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();

    const parsed = promoItemActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid action.');
    const { action, notes } = parsed.data;

    const item = await prisma.promotionOrderItem.findUnique({
      where: { id: params.id },
      include: { placement: true },
    });
    if (!item) throw new ApiError(404, 'Promotion item not found.');

    if (action === 'approve') {
      if (!['PENDING_REVIEW', 'PAID'].includes(item.status)) {
        throw new ApiError(400, `Cannot approve an item in status ${item.status}.`);
      }
    } else if (action === 'reject') {
      if (!['PENDING_REVIEW', 'PAID', 'APPROVED'].includes(item.status)) {
        throw new ApiError(400, `Cannot reject an item in status ${item.status}.`);
      }
    } else if (action === 'fulfill') {
      if (!['APPROVED', 'PENDING_REVIEW'].includes(item.status)) {
        throw new ApiError(400, `Cannot fulfill an item in status ${item.status}.`);
      }
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        await tx.promotionOrderItem.update({
          where: { id: item.id },
          data: { status: 'APPROVED', adminNotes: notes || null },
        });
        if (item.placement) {
          const isLiveNow = item.placement.startAt <= now && item.placement.endAt > now;
          await tx.homepageTilePlacement.update({
            where: { id: item.placement.id },
            data: { status: isLiveNow ? 'LIVE' : 'APPROVED' },
          });
        }
      }

      if (action === 'reject') {
        await tx.promotionOrderItem.update({
          where: { id: item.id },
          data: { status: 'REJECTED', adminNotes: notes || null },
        });
        if (item.placement) {
          // Rejected placements free the slot for other organizers.
          await tx.homepageTilePlacement.update({
            where: { id: item.placement.id },
            data: { status: 'REJECTED', adminNotes: notes || null },
          });
        }
      }

      if (action === 'fulfill') {
        await tx.promotionOrderItem.update({
          where: { id: item.id },
          data: { status: 'FULFILLED', fulfilledAt: now, adminNotes: notes || null },
        });
      }

      // Roll the parent order status up once no item is left awaiting review.
      const siblings = await tx.promotionOrderItem.findMany({
        where: { orderId: item.orderId },
        select: { status: true },
      });
      const statuses = new Set(siblings.map((sibling) => sibling.status));
      if (!statuses.has('PENDING_REVIEW') && !statuses.has('PENDING_PAYMENT')) {
        let orderStatus: 'APPROVED' | 'REJECTED' | 'FULFILLED' = 'APPROVED';
        if ([...statuses].every((status) => status === 'REJECTED')) orderStatus = 'REJECTED';
        else if ([...statuses].every((status) => ['FULFILLED', 'REJECTED'].includes(status))) {
          orderStatus = 'FULFILLED';
        }
        await tx.promotionOrder.update({
          where: { id: item.orderId },
          data: { status: orderStatus },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
