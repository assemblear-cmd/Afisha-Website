import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';

// Revokes a scanner-access grant. Revoked staff lose scanning immediately —
// the scan endpoint re-checks the grant on every request.

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();

    const grant = await prisma.eventScannerAccess.findUnique({ where: { id: params.id } });
    if (!grant) throw new ApiError(404, 'Access grant not found.');
    await requireEventOwnership(grant.eventId, user);

    await prisma.eventScannerAccess.update({
      where: { id: grant.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
