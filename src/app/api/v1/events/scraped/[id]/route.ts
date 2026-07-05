import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { formatListingPrice } from '@/lib/format';

// Scraped show detail. The CTA is always the original sourceUrl (opened in a
// browser/custom tab); scraped events never enter DondeGO checkout, so this
// response carries no ticket types. Accepts raw cuid or "show_<id>" wire id.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id.startsWith('show_') ? params.id.slice('show_'.length) : params.id;

    const show = await prisma.show.findUnique({
      where: { id },
      include: {
        theater: { select: { name: true, slug: true, website: true, city: true } },
      },
    });

    if (!show || !show.isActive) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const priceText =
      show.priceText?.trim() || formatListingPrice(show.priceCents, show.currency);

    return NextResponse.json({
      event: {
        id: `show_${show.id}`,
        kind: 'scraped',
        title: show.title,
        description: show.description,
        startsAt: show.startsAt?.toISOString() ?? null,
        endsAt: show.endsAt?.toISOString() ?? null,
        venueName: show.venue ?? show.theater.name,
        city: show.theater.city,
        imageUrl: show.imageUrl,
        categories: show.categories.length > 0 ? show.categories : ['otros'],
        priceText: priceText || null,
        priceMinor: show.priceCents,
        currency: show.currency,
        sourceUrl: show.sourceUrl,
        theater: {
          name: show.theater.name,
          slug: show.theater.slug,
          website: show.theater.website,
        },
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
