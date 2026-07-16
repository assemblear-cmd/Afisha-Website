import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createEventSchema } from '@/lib/validations';
import { dollarsToCents } from '@/lib/format';

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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('query') ?? '';
  const city = searchParams.get('city') ?? '';
  const category = searchParams.get('category') ?? '';
  const date = searchParams.get('date') ?? '';

  const where: Prisma.EventWhereInput = {
    isPublished: true,
    status: 'PUBLISHED',
    startsAt: { gte: new Date() },
  };

  if (category) {
    where.category = category;
  }

  if (city) {
    where.city = { contains: city };
  }

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { description: { contains: query } },
      { venue: { contains: query } },
      { city: { contains: query } },
    ];
  }

  if (date) {
    // date is YYYY-MM-DD; show events starting on or after that calendar day
    const dayStart = new Date(date);
    if (!isNaN(dayStart.getTime())) {
      where.startsAt = { gte: dayStart };
    }
  }

  const events = await prisma.event.findMany({
    where,
    select: PUBLIC_EVENT_SELECT,
    orderBy: { startsAt: 'asc' },
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  // Any logged-in user can create an event; they become its organizer.

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation error.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
  }

  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const coverImage =
    data.coverImage && data.coverImage !== ''
      ? data.coverImage
      : `https://picsum.photos/seed/${slug}/800/450`;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      venue: data.venue,
      city: data.city,
      address: data.address,
      startsAt,
      endsAt,
      coverImage,
      status: 'DRAFT',
      isPublished: false,
      contactName: user.name,
      contactEmail: user.email,
      organizerId: user.id,
      ticketTypes: {
        create: data.ticketTypes.map((tt) => ({
          name: tt.name,
          priceCents: dollarsToCents(tt.price),
          quantity: tt.quantity,
        })),
      },
    },
  });

  return NextResponse.json({ event: { id: event.id } }, { status: 201 });
}
