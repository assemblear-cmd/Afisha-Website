import { NextResponse } from 'next/server';
import { locales } from '@/i18n/config';

// Client bootstrap config. Only publishable/publicly safe values belong
// here — never STRIPE_SECRET_KEY or other server secrets.

export async function GET() {
  return NextResponse.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    minSupportedAppVersion: 1,
    defaultCurrency: 'CLP',
    locales,
  });
}
