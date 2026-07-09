import { NextRequest, NextResponse } from 'next/server';
import { runScrape } from '@/lib/scrapers';
import { isCronAuthorized } from '@/lib/cron-auth';

// Weekly Vercel Cron target for the cross-city event platforms (Eventbrite,
// Fever, viagogo, StubHub — Theater rows whose adapter is a platform key).
// Kept separate from the daily venue scan: marketplaces change slower and are
// far more sensitive to crawl frequency. Protected by CRON_SECRET the same way
// as /api/cron/scrape-theaters.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await runScrape('platforms');
  const totals = results.reduce(
    (acc, r) => ({
      platforms: acc.platforms + 1,
      found: acc.found + r.found,
      upserted: acc.upserted + r.upserted,
      failed: acc.failed + (r.ok ? 0 : 1),
    }),
    { platforms: 0, found: 0, upserted: 0, failed: 0 }
  );

  return NextResponse.json({ startedAt, finishedAt: new Date().toISOString(), totals, results });
}
