import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { EVENT_CATEGORIES } from '@/lib/taxonomy';

// Per-account feed preferences captured by the registration onboarding
// questions (interested event categories + followed venues). GET returns the
// saved answers; PUT replaces whichever lists are present in the body.
// Category slugs are validated against the taxonomy and venue slugs against
// the active Theater list, so bad input degrades to "fewer picks", never 500s.

const MAX_PICKS = 50;

function sanitizeStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const unique = [...new Set(value.filter((item): item is string => typeof item === 'string'))];
  return unique.slice(0, MAX_PICKS);
}

export async function GET() {
  try {
    const user = await requireUser();
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferredCategories: true, preferredVenues: true },
    });
    return NextResponse.json({
      preferredCategories: record?.preferredCategories ?? [],
      preferredVenues: record?.preferredVenues ?? [],
    });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
    }

    const categories = sanitizeStrings((body as Record<string, unknown>).preferredCategories);
    const venues = sanitizeStrings((body as Record<string, unknown>).preferredVenues);
    if (categories === null && venues === null) {
      return NextResponse.json(
        { error: 'Provide preferredCategories and/or preferredVenues arrays.' },
        { status: 400 }
      );
    }

    const data: { preferredCategories?: string[]; preferredVenues?: string[] } = {};
    if (categories !== null) {
      data.preferredCategories = categories.filter((slug) =>
        (EVENT_CATEGORIES as readonly string[]).includes(slug)
      );
    }
    if (venues !== null) {
      const known = await prisma.theater.findMany({
        where: { isActive: true, slug: { in: venues } },
        select: { slug: true },
      });
      const knownSlugs = new Set(known.map((theater) => theater.slug));
      data.preferredVenues = venues.filter((slug) => knownSlugs.has(slug));
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { preferredCategories: true, preferredVenues: true },
    });

    return NextResponse.json({
      preferredCategories: updated.preferredCategories,
      preferredVenues: updated.preferredVenues,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
