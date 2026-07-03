import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer, requireEventOwnership } from '@/lib/authz';
import { scannerGrantSchema } from '@/lib/organizer/validation';

// Grants event-level scanner access by email. If the email has no account
// yet, the grant stays INVITED and is linked to the user on first scan.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireOrganizer();
    const event = await requireEventOwnership(params.id, user);

    const parsed = scannerGrantSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, 'Enter a valid email.');
    const email = parsed.data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });

    const grant = await prisma.eventScannerAccess.upsert({
      where: { eventId_email: { eventId: event.id, email } },
      create: {
        eventId: event.id,
        email,
        userId: existingUser?.id ?? null,
        status: existingUser ? 'ACTIVE' : 'INVITED',
        createdById: user.id,
      },
      update: {
        status: existingUser ? 'ACTIVE' : 'INVITED',
        userId: existingUser?.id ?? null,
        createdById: user.id,
        revokedAt: null,
      },
    });

    return NextResponse.json({ grant: { id: grant.id, status: grant.status } }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
