import Stripe from 'stripe';
import { ApiError } from '@/lib/api-error';

// Payment provider abstraction. Stripe is the only provider today; keeping
// construction and session helpers here means routes never touch the SDK or
// env directly, and a future provider (or Stripe Connect) swaps in one place.

let cachedClient: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ApiError(503, 'Payments are not configured. Set STRIPE_SECRET_KEY.');
  }
  if (!cachedClient) {
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}

/** Base URL for Stripe success/cancel/webhook redirects. */
export function getAppUrl(): string {
  return process.env.APP_URL ?? 'http://127.0.0.1:3000';
}

export type CheckoutLineItem = {
  name: string;
  // Minor units (CLP: whole pesos) — matches Stripe's zero-decimal handling.
  unitAmountMinor: number;
  currency: string;
  quantity: number;
};

export type CreateSessionInput = {
  paymentId: string;
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: Record<string, string>;
};

export async function createStripeCheckoutSession(input: CreateSessionInput) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: input.lineItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.unitAmountMinor,
        product_data: { name: item.name },
      },
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    // Metadata links the Stripe session back to our Payment row; the webhook
    // uses the session id, and metadata is a human-debuggable backup.
    metadata: { paymentId: input.paymentId, ...input.metadata },
  });
}

/** Verifies the webhook signature and returns the parsed event. */
export async function verifyStripeWebhook(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new ApiError(503, 'Webhook not configured. Set STRIPE_WEBHOOK_SECRET.');
  }
  const stripe = getStripe();
  try {
    return await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch {
    throw new ApiError(400, 'Invalid webhook signature.');
  }
}
