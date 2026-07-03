import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer } from '@/lib/authz';
import { postPayoutRelease } from '@/lib/finance/ledger';

// Organizer cancels their own not-yet-approved payout request; the held
// amount returns to the available balance.

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();

    const payout = await prisma.payoutRequest.findUnique({ where: { id: params.id } });
    if (!payout) throw new ApiError(404, 'Payout request not found.');
    if (payout.organizerId !== user.id && user.role !== 'admin') {
      throw new ApiError(403, 'You do not have access to this payout request.');
    }
    if (!['PENDING', 'IN_REVIEW'].includes(payout.status)) {
      throw new ApiError(400, `Payout in status ${payout.status} cannot be cancelled.`);
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.payoutRequest.updateMany({
        where: { id: payout.id, status: { in: ['PENDING', 'IN_REVIEW'] } },
        data: { status: 'CANCELLED' },
      });
      if (changed.count > 0) {
        await postPayoutRelease(tx, {
          payoutRequestId: payout.id,
          organizerId: payout.organizerId,
          eventId: payout.eventId,
          amountClp: payout.amountClp,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
