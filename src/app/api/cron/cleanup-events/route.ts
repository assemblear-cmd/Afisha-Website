import { NextRequest, NextResponse } from 'next/server';
import { parseRetentionDays, runEventCleanup } from '@/lib/event-cleanup';
import { isCronAuthorized } from '@/lib/cron-auth';

// Protected cron target for DB hygiene. Use ?dryRun=1 locally to inspect the
// cleanup set without deleting rows.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isDryRun(req: NextRequest): boolean {
  const value = req.nextUrl.searchParams.get('dryRun') ?? req.nextUrl.searchParams.get('dry-run');
  return value === '1' || value === 'true' || value === 'yes';
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = new Date().toISOString();
    const retentionParam = req.nextUrl.searchParams.get('retentionDays');
    const retentionDays = retentionParam == null ? undefined : parseRetentionDays(retentionParam);
    const result = await runEventCleanup({
      dryRun: isDryRun(req),
      retentionDays,
    });

    return NextResponse.json({
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('Event cleanup failed:', error);
    return NextResponse.json({ error: 'Event cleanup failed.' }, { status: 500 });
  }
}
