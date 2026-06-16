import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      ticketTypes: true,
      organizer: { select: { id: true, name: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  return NextResponse.json({ event });
}
