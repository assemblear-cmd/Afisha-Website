import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/api-error';
import { verifyStripeWebhook } from '@/lib/payments/stripe';
import {
  handleChargeRefunded,
  handleSessionCompleted,
  handleSessionExpired,
} from '@/lib/payments/finalize';

// Stripe webhook — the single source of truth for payment status. Signature
// is verified against the raw body; event ids are deduped in WebhookEvent so
// redeliveries are idempotent (and every downstream mutation is guarded /
// keyed as well). A processing failure returns 500 *before* the dedupe row is
// written, so Stripe retries the delivery.

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await verifyStripeWebhook(rawBody, signature);
  } catch (error) {
    return errorHandler(error);
  }

  const alreadyProcessed = await prisma.webhookEvent.findUnique({
    where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
          await handleSessionCompleted(session.id, paymentIntentId);
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSessionExpired(session.id, 'CANCELLED');
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSessionExpired(session.id, 'FAILED');
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;
        if (paymentIntentId) {
          await handleChargeRefunded(paymentIntentId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook processing failed for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }

  await prisma.webhookEvent
    .create({ data: { provider: 'stripe', externalId: event.id, type: event.type } })
    .catch(() => {
      // A concurrent delivery already recorded it — fine, processing is idempotent.
    });

  return NextResponse.json({ received: true });
}
