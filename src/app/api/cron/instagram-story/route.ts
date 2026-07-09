import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { runInstagramStoryPost } from '@/lib/promotion/instagram-story';

// Scheduled marketing agent: posts one Instagram Story for the next upcoming
// Santiago event via the Graph API (see src/lib/promotion/instagram-story).
// Protected by CRON_SECRET like the other cron targets. `?dryRun=1` selects
// and returns the event + image URL without posting (also works without
// Instagram credentials configured), for safe verification.
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

  const startedAt = new Date().toISOString();
  try {
    const result = await runInstagramStoryPost({ dryRun: isDryRun(req) });
    const httpStatus = result.status === 'failed' ? 502 : 200;
    return NextResponse.json({ startedAt, finishedAt: new Date().toISOString(), result }, { status: httpStatus });
  } catch (error) {
    console.error('Instagram story cron failed:', error);
    return NextResponse.json({ error: 'Instagram story post failed.' }, { status: 500 });
  }
}
