import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { Card, Container, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

// Landing page for Stripe success/cancel redirects and free-order
// confirmations. The redirect never decides payment status — we show what the
// webhook has (or hasn't yet) confirmed in the DB.
export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: { order?: string; outcome?: string };
}) {
  const orderId = searchParams.order;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { id: true, title: true } },
      _count: { select: { tickets: true } },
    },
  });
  if (!order) notFound();

  const isPaid = order.status === 'PAID' || order.status === 'paid';
  const isPending = order.status === 'PENDING';
  const cancelled = searchParams.outcome === 'cancelled';

  return (
    <Container className="max-w-xl py-16">
      <Card className="space-y-4 p-8 text-center">
        {isPaid ? (
          <>
            <h1 className="text-2xl font-bold text-ink">Tickets confirmed 🎟️</h1>
            <p className="text-body">
              {order._count.tickets} ticket{order._count.tickets === 1 ? '' : 's'} for{' '}
              <span className="font-semibold">{order.event.title}</span> —{' '}
              {formatMoney(order.totalCents, order.currency)}. A QR code was issued for each
              ticket.
            </p>
            <LinkButton href="/account/tickets" variant="primary">
              View my tickets
            </LinkButton>
          </>
        ) : cancelled ? (
          <>
            <h1 className="text-2xl font-bold text-ink">Payment cancelled</h1>
            <p className="text-body">
              Nothing was charged. Your reservation is released automatically if the payment
              session expires.
            </p>
            <LinkButton href={`/events/${order.event.id}`} variant="primary">
              Back to the event
            </LinkButton>
          </>
        ) : isPending ? (
          <>
            <h1 className="text-2xl font-bold text-ink">Processing payment…</h1>
            <p className="text-body">
              We&apos;re waiting for the payment provider to confirm your payment. This usually
              takes a few seconds —{' '}
              <Link href={`/checkout/result?order=${order.id}&outcome=success`} className="font-semibold text-coral">
                refresh
              </Link>{' '}
              to check again.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Order {order.status.toLowerCase()}</h1>
            <p className="text-body">This order is not active. If you were charged, contact DondeGO.</p>
            <LinkButton href={`/events/${order.event.id}`} variant="primary">
              Back to the event
            </LinkButton>
          </>
        )}
      </Card>
    </Container>
  );
}
