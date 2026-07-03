import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireAdmin } from '@/lib/authz';
import { payoutActionSchema } from '@/lib/organizer/validation';
import { postPayoutPaid, postPayoutRelease } from '@/lib/finance/ledger';

// Admin payout moderation: approve / reject / mark as paid (manual transfer).
// TODO: Stripe Connect automated payouts as a future extension.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();

    const parsed = payoutActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Invalid action.');
    const { action, notes } = parsed.data;

    const payout = await prisma.payoutRequest.findUnique({ where: { id: params.id } });
    if (!payout) throw new ApiError(404, 'Payout request not found.');

    const ledgerInput = {
      payoutRequestId: payout.id,
      organizerId: payout.organizerId,
      eventId: payout.eventId,
      amountClp: payout.amountClp,
    };

    await prisma.$transaction(async (tx) => {
      if (action === 'start_review') {
        if (payout.status !== 'PENDING') {
          throw new ApiError(400, `Cannot review a payout in status ${payout.status}.`);
        }
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'IN_REVIEW', reviewedById: admin.id, adminNotes: notes || null },
        });
      }

      if (action === 'approve') {
        if (!['PENDING', 'IN_REVIEW'].includes(payout.status)) {
          throw new ApiError(400, `Cannot approve a payout in status ${payout.status}.`);
        }
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'APPROVED', reviewedById: admin.id, adminNotes: notes || null },
        });
      }

      if (action === 'reject') {
        if (!['PENDING', 'IN_REVIEW', 'APPROVED'].includes(payout.status)) {
          throw new ApiError(400, `Cannot reject a payout in status ${payout.status}.`);
        }
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'REJECTED', reviewedById: admin.id, adminNotes: notes || null },
        });
        // Return the held amount to the organizer's available balance.
        await postPayoutRelease(tx, ledgerInput);
      }

      if (action === 'mark_paid') {
        if (!['APPROVED', 'PROCESSING'].includes(payout.status)) {
          throw new ApiError(400, `Cannot mark a payout in status ${payout.status} as paid.`);
        }
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            reviewedById: admin.id,
            adminNotes: notes || null,
          },
        });
        await postPayoutPaid(tx, ledgerInput);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
