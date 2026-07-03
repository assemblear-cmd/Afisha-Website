import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { payoutRequestSchema } from '@/lib/organizer/validation';
import { eventFinance, payoutEligibility, postPayoutHold } from '@/lib/finance/ledger';

// Payout requests: ownership + COMPLETED event + available balance are all
// verified server-side; the amount is immediately held on the ledger so the
// same pesos can't be requested twice.

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizer();

    const parsed = payoutRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Validation error.');
    }
    const event = await requireEventOwnership(parsed.data.eventId, user);
    if (event.organizerId !== user.id) {
      // Admins can moderate payouts but requests belong to the owning organizer.
      throw new ApiError(403, 'Only the event organizer can request a payout.');
    }

    const finance = await eventFinance(event.id);
    const amountClp = parsed.data.amountClp ?? finance.availableClp;

    const eligibility = payoutEligibility({
      eventStatus: event.status,
      availableClp: finance.availableClp,
      requestedClp: amountClp,
    });
    if (!eligibility.ok) throw new ApiError(400, eligibility.reason!);

    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.payoutRequest.create({
        data: {
          organizerId: user.id,
          eventId: event.id,
          amountClp,
          notes: parsed.data.notes || null,
        },
      });
      await postPayoutHold(tx, {
        payoutRequestId: created.id,
        organizerId: user.id,
        eventId: event.id,
        amountClp,
      });
      return created;
    });

    return NextResponse.json({ payout: { id: payout.id, status: payout.status } }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
