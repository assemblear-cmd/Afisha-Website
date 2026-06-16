import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDateTime } from '@/lib/format';
import { Badge, Card, Container, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order confirmed' };

interface PageProps {
  params: { id: string };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { ticketType: true } },
      event: true,
    },
  });

  if (!order) notFound();

  const shortId = order.id.slice(-8).toUpperCase();

  return (
    <Container className="py-16 max-w-2xl">
      {/* Success hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <Badge tone="success" className="mb-3">
          Payment successful
        </Badge>
        <h1 className="text-3xl font-bold text-ink mt-2">
          You&apos;re going to {order.event.title}!
        </h1>
        <p className="text-muted mt-2">
          A confirmation was sent to {order.buyerEmail}.
        </p>
      </div>

      {/* Order summary */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Order summary</h2>

        <div className="text-sm text-muted space-y-1">
          <p>
            Order{' '}
            <span className="font-mono font-medium text-body">#{shortId}</span>
          </p>
          <p>{formatDateTime(order.event.startsAt)}</p>
          <p>
            {order.event.venue}, {order.event.city}
          </p>
        </div>

        <hr className="border-ink/10" />

        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm text-body">
              <span>
                {item.quantity} × {item.ticketType.name}
              </span>
              <span>{formatPrice(item.quantity * item.unitPriceCents)}</span>
            </li>
          ))}
        </ul>

        <hr className="border-ink/10" />

        <div className="flex justify-between font-semibold text-ink">
          <span>Total paid</span>
          <span>{formatPrice(order.totalCents)}</span>
        </div>
      </Card>

      {/* Navigation actions */}
      <div className="flex flex-wrap gap-3 mt-8 justify-center">
        <LinkButton href="/events" variant="secondary">
          Browse more events
        </LinkButton>
        <LinkButton href={`/events/${order.eventId}`} variant="primary">
          View event
        </LinkButton>
      </div>
    </Container>
  );
}
