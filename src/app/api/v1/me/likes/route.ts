import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { formatListingPrice } from '@/lib/format';
import type { MobileEventSummary } from '@/lib/mobile/events';

// Feed likes. A target is the mobile wire-id ("event_<id>" native organizer
// event | "show_<id>" scraped show), which is globally unique across both.
// GET lists the user's liked items as event summaries (+ the raw keys so the
// feed can mark hearts); POST adds a like; DELETE removes one.

type Parsed = { kind: 'native' | 'scraped'; rawId: string; key: string };

function parseKey(wireId: unknown): Parsed | null {
  if (typeof wireId !== 'string') return null;
  if (wireId.startsWith('event_')) {
    const rawId = wireId.slice('event_'.length);
    return rawId ? { kind: 'native', rawId, key: wireId } : null;
  }
  if (wireId.startsWith('show_')) {
    const rawId = wireId.slice('show_'.length);
    return rawId ? { kind: 'scraped', rawId, key: wireId } : null;
  }
  return null;
}

export async function GET() {
  try {
    const user = await requireUser();
    const likes = await prisma.eventLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    const keys = likes.map((like) => like.targetKey);
    const parsed = keys.map(parseKey).filter((p): p is Parsed => p !== null);
    const eventIds = parsed.filter((p) => p.kind === 'native').map((p) => p.rawId);
    const showIds = parsed.filter((p) => p.kind === 'scraped').map((p) => p.rawId);

    const [events, shows] = await Promise.all([
      eventIds.length
        ? prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: {
              id: true, title: true, startsAt: true, venue: true, category: true,
              coverImage: true, isFree: true,
              ticketTypes: {
                where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
                select: { priceCents: true, currency: true },
              },
            },
          })
        : Promise.resolve([]),
      showIds.length
        ? prisma.show.findMany({
            where: { id: { in: showIds } },
            select: {
              id: true, title: true, startsAt: true, venue: true, categories: true,
              priceText: true, priceCents: true, currency: true, sourceUrl: true,
              imageUrl: true, theater: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const eventById = new Map(events.map((e) => [e.id, e]));
    const showById = new Map(shows.map((s) => [s.id, s]));

    // Preserve like order (newest first) while resolving to summaries.
    const items: MobileEventSummary[] = [];
    for (const p of parsed) {
      if (p.kind === 'native') {
        const e = eventById.get(p.rawId);
        if (!e) continue;
        const cheapest = [...e.ticketTypes].sort((a, b) => a.priceCents - b.priceCents)[0];
        items.push({
          id: `event_${e.id}`,
          kind: 'native',
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          venueName: e.venue,
          imageUrl: e.coverImage,
          categories: [e.category],
          sourceUrl: null,
          priceText: e.isFree ? null : cheapest ? formatListingPrice(cheapest.priceCents, cheapest.currency) : null,
          priceMinor: null,
          minPriceMinor: cheapest ? cheapest.priceCents : null,
          currency: cheapest?.currency ?? 'CLP',
        });
      } else {
        const s = showById.get(p.rawId);
        if (!s) continue;
        items.push({
          id: `show_${s.id}`,
          kind: 'scraped',
          title: s.title,
          startsAt: s.startsAt?.toISOString() ?? null,
          venueName: s.venue ?? s.theater.name,
          imageUrl: s.imageUrl,
          categories: s.categories,
          sourceUrl: s.sourceUrl,
          priceText: s.priceText?.trim() || formatListingPrice(s.priceCents, s.currency) || null,
          priceMinor: s.priceCents,
          minPriceMinor: null,
          currency: s.currency,
        });
      }
    }

    return NextResponse.json({ items, keys });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = parseKey(body?.id);
    if (!parsed) return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    await prisma.eventLike.upsert({
      where: { userId_targetKey: { userId: user.id, targetKey: parsed.key } },
      create: { userId: user.id, targetKey: parsed.key },
      update: {},
    });
    return NextResponse.json({ ok: true, liked: true });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = parseKey(body?.id);
    if (!parsed) return NextResponse.json({ error: 'Invalid event id.' }, { status: 400 });
    await prisma.eventLike.deleteMany({ where: { userId: user.id, targetKey: parsed.key } });
    return NextResponse.json({ ok: true, liked: false });
  } catch (error) {
    return errorHandler(error);
  }
}
