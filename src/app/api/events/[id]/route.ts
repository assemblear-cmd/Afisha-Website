import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public projection: never expose organizer contact details (contactName /
// contactEmail / contactPhone) or internal moderationNotes to unauthenticated
// callers. Mirrors the field whitelist used by the /api/v1 event routes.
const PUBLIC_EVENT_SELECT = {
  id: true,
  title: true,
  shortDescription: true,
  description: true,
  category: true,
  venue: true,
  city: true,
  address: true,
  startsAt: true,
  endsAt: true,
  coverImage: true,
  isFree: true,
  isPublished: true,
  status: true,
  createdAt: true,
  organizer: { select: { id: true, name: true } },
  ticketTypes: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: PUBLIC_EVENT_SELECT,
  });

  if (!event || event.status !== 'PUBLISHED' || !event.isPublished) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  return NextResponse.json({ event });
}
