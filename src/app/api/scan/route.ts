import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '@/lib/api-error';
import { requireUser } from '@/lib/authz';
import { scanRequestSchema } from '@/lib/organizer/validation';
import { performScan } from '@/lib/tickets/verify';
import { consumeRateLimit, tooManyRequests } from '@/lib/rate-limit';

// Ticket verification endpoint used by the camera scanner and the manual
// token input. Access control (admin / organizer / staff grant) happens
// inside performScan, and every attempt is written to scan history.

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Every attempt writes a TicketScan row — cap the write rate per user.
    // 120/min still allows a busy entrance scanning ~2 tickets per second.
    const limit = consumeRateLimit('scan_user', user.id);
    if (!limit.ok) return tooManyRequests(limit);

    const parsed = scanRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scan request.' }, { status: 400 });
    }

    const outcome = await performScan(user, {
      eventId: parsed.data.eventId,
      rawValue: parsed.data.value,
      deviceInfo: req.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json(outcome);
  } catch (error) {
    return errorHandler(error);
  }
}
