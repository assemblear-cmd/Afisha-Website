import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice, formatDateTime } from '@/lib/format';
import { Card, Container, LinkButton } from '@/components/ui';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Checkout' };

interface PageProps {
  params: { id: string };
  searchParams: { items?: string };
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { ticketTypes: true },
  });

  if (!event) notFound();

  // Parse items query param: "ticketTypeId:qty,ticketTypeId:qty"
  const rawItems = searchParams.items ?? '';
  type SelectionItem = {
    ticketTypeId: string;
    name: string;
    priceCents: number;
    quantity: number;
  };

  const selection: SelectionItem[] = rawItems
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const [id, qtyStr] = part.split(':');
      const qty = parseInt(qtyStr ?? '0', 10);
      if (!id || isNaN(qty) || qty <= 0) return [];
      const tt = event.ticketTypes.find((t) => t.id === id);
      if (!tt) return [];
      const remaining = tt.quantity - tt.sold;
      if (qty > remaining) return [];
      return [{ ticketTypeId: tt.id, name: tt.name, priceCents: tt.priceCents, quantity: qty }];
    });

  const user = await getCurrentUser();
  const total = selection.reduce((sum, s) => sum + s.priceCents * s.quantity, 0);

  if (selection.length === 0) {
    return (
      <Container className="py-16 text-center">
        <p className="text-body mb-6">Your selection expired — pick tickets again.</p>
        <LinkButton href={`/events/${event.id}`} variant="secondary">
          Back to event
        </LinkButton>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold text-ink mb-8">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: form (spans 2 cols) */}
        <div className="lg:col-span-2">
          <CheckoutForm
            eventId={event.id}
            selection={selection}
            defaultName={user?.name}
            defaultEmail={user?.email}
          />
        </div>

        {/* Right: order summary */}
        <div>
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-ink text-lg">{event.title}</h2>
            <p className="text-sm text-muted">{formatDateTime(event.startsAt)}</p>
            <hr className="border-ink/10" />
            <ul className="space-y-2">
              {selection.map((s) => (
                <li key={s.ticketTypeId} className="flex justify-between text-sm text-body">
                  <span>
                    {s.quantity} × {s.name}
                  </span>
                  <span>{formatPrice(s.quantity * s.priceCents)}</span>
                </li>
              ))}
            </ul>
            <hr className="border-ink/10" />
            <div className="flex justify-between font-semibold text-ink">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}
