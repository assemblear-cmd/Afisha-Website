import { NextRequest, NextResponse } from 'next/server';
import { runScrape } from '@/lib/scrapers';
import { isCronAuthorized } from '@/lib/cron-auth';

// Daily Vercel Cron target. Protected by CRON_SECRET: Vercel Cron sends
// `Authorization: Bearer ${CRON_SECRET}`. A `?secret=` query param is accepted
// only outside production for manual triggering during development.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await runScrape();
  const totals = results.reduce(
    (acc, r) => ({
      theaters: acc.theaters + 1,
      found: acc.found + r.found,
      upserted: acc.upserted + r.upserted,
      failed: acc.failed + (r.ok ? 0 : 1),
    }),
    { theaters: 0, found: 0, upserted: 0, failed: 0 }
  );

  return NextResponse.json({ startedAt, finishedAt: new Date().toISOString(), totals, results });
}
