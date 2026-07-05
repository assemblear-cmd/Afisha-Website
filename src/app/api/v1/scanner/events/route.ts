import { NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { requireUser, scannableEvents, scannerEnabledForEvent } from '@/lib/authz';

// Scanner event picker. Any signed-in user may call it; the query itself
// returns only events the caller can scan (admin, event organizer, or active
// staff grant). `scannerEnabled` reflects the paid-event / free-add-on rule.
// Actual authorization for a scan is re-checked server-side in performScan.

export async function GET() {
  try {
    const user = await requireUser();
    const events = await scannableEvents(user);

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        isFree: event.isFree,
        scannerEnabled: scannerEnabledForEvent(event),
      })),
    });
  } catch (error) {
    return errorHandler(error);
  }
}
