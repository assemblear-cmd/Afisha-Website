import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, errorHandler } from '@/lib/api-error';
import { requireOrganizer } from '@/lib/authz';
import { organizerEventSchema } from '@/lib/organizer/validation';

// Organizer event drafts. Creation always starts in DRAFT with isPublished
// false; publication only ever happens through admin moderation.

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizer();

    const parsed = organizerEventSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Validation error.');
    }
    const data = parsed.data;

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      throw new ApiError(400, 'Invalid start or end date.');
    }
    if (endsAt <= startsAt) {
      throw new ApiError(400, 'End date must be after start date.');
    }

    const slugSeed = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const event = await prisma.event.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription || null,
        description: data.description,
        category: data.category,
        venue: data.venue,
        address: data.address,
        city: data.city || 'Santiago',
        startsAt,
        endsAt,
        coverImage: data.coverImage || `https://picsum.photos/seed/${slugSeed}/800/450`,
        isFree: data.eventType === 'free',
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        status: 'DRAFT',
        isPublished: false,
        organizerId: user.id,
      },
    });

    return NextResponse.json({ event: { id: event.id } }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function GET() {
  try {
    const user = await requireOrganizer();
    const events = await prisma.event.findMany({
      where: { organizerId: user.id },
      select: { id: true, title: true, status: true, startsAt: true, isFree: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ events });
  } catch (error) {
    return errorHandler(error);
  }
}
