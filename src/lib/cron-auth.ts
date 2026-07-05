import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

// Shared authorization for Vercel Cron targets. Vercel sends
// `Authorization: Bearer ${CRON_SECRET}`. A `?secret=` query param is accepted
// only outside production for manual triggering, because query strings leak
// into access logs, proxies, browser history and Referer headers.

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // timingSafeEqual throws on length mismatch; compare lengths first (a length
  // difference is not itself secret) and always run the constant-time check.
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('authorization');
  if (header && safeEqual(header, `Bearer ${secret}`)) return true;

  if (process.env.NODE_ENV !== 'production') {
    const fromQuery = req.nextUrl.searchParams.get('secret');
    if (fromQuery && safeEqual(fromQuery, secret)) return true;
  }

  return false;
}
