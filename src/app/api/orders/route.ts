// Payment is simulated — card details are validated for format only and never stored.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkoutSchema } from '@/lib/validations';
import { ApiError, errorHandler } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const eventId = typeof raw.eventId === 'string' ? raw.eventId : null;
  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required.' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse({
    buyerName: raw.buyerName,
    buyerEmail: raw.buyerEmail,
    card: raw.card,
    items: raw.items,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation error.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { buyerName, buyerEmail, items } = parsed.data;
  // card is validated above but NEVER persisted — discard it here.

  // Filter to only items with qty > 0
  const activeItems = items.filter((i) => i.quantity > 0);
  if (activeItems.length === 0) {
    return NextResponse.json({ error: 'Select at least one ticket.' }, { status: 400 });
  }

  const ticketTypeIds = activeItems.map((i) => i.ticketTypeId);

  // Load ticket types from DB — prices are ALWAYS re-derived from DB rows.
  const dbTicketTypes = await prisma.ticketType.findMany({
    where: { id: { in: ticketTypeIds }, eventId },
  });

  if (dbTicketTypes.length !== ticketTypeIds.length) {
    return NextResponse.json({ error: 'One or more ticket types are invalid.' }, { status: 400 });
  }

  // Pre-check availability before transaction (fast path)
  for (const item of activeItems) {
    const tt = dbTicketTypes.find((t) => t.id === item.ticketTypeId);
    if (!tt) {
      return NextResponse.json({ error: 'Invalid ticket type.' }, { status: 400 });
    }
    const remaining = tt.quantity - tt.sold;
    if (item.quantity > remaining) {
      return NextResponse.json(
        { error: `"${tt.name}" only has ${remaining} tickets left.` },
        { status: 400 }
      );
    }
  }

  // Compute total from DB prices — NEVER trust client-sent prices.
  const totalCents = activeItems.reduce((sum, item) => {
    const tt = dbTicketTypes.find((t) => t.id === item.ticketTypeId)!;
    return sum + tt.priceCents * item.quantity;
  }, 0);

  const currentUser = await getCurrentUser();

  try {
    // Run everything in a transaction with a fresh availability re-check to prevent oversell.
    const order = await prisma.$transaction(async (tx) => {
      // Re-check availability inside the transaction on fresh rows.
      const freshTicketTypes = await tx.ticketType.findMany({
        where: { id: { in: ticketTypeIds }, eventId },
      });

      for (const item of activeItems) {
        const tt = freshTicketTypes.find((t) => t.id === item.ticketTypeId);
        // These throws are translated to a clean 400 by errorHandler — e.g. when a
        // concurrent buyer wins the race between the pre-check and the commit.
        if (!tt) throw new ApiError(400, 'Invalid ticket type.');
        const remaining = tt.quantity - tt.sold;
        if (item.quantity > remaining) {
          throw new ApiError(400, `"${tt.name}" only has ${remaining} tickets left.`);
        }
      }

      const created = await tx.order.create({
        data: {
          buyerName,
          buyerEmail,
          totalCents,
          status: 'paid',
          eventId,
          userId: currentUser?.id ?? null,
          items: {
            create: activeItems.map((item) => {
              const tt = freshTicketTypes.find((t) => t.id === item.ticketTypeId)!;
              return {
                ticketTypeId: item.ticketTypeId,
                quantity: item.quantity,
                unitPriceCents: tt.priceCents,
              };
            }),
          },
        },
      });

      // Increment sold counts for each ticket type.
      await Promise.all(
        activeItems.map((item) =>
          tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: { sold: { increment: item.quantity } },
          })
        )
      );

      return created;
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
