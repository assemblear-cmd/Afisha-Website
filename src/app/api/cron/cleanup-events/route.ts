import { NextRequest, NextResponse } from 'next/server';
import { parseRetentionDays, runEventCleanup } from '@/lib/event-cleanup';

// Protected cron target for DB hygiene. Use ?dryRun=1 locally to inspect the
// cleanup set without deleting rows.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}

function isDryRun(req: NextRequest): boolean {
  const value = req.nextUrl.searchParams.get('dryRun') ?? req.nextUrl.searchParams.get('dry-run');
  return value === '1' || value === 'true' || value === 'yes';
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
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
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
