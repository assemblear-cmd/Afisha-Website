import { getCurrentUser } from '@/lib/auth';
import { scannableEvents, scannerEnabledForEvent } from '@/lib/authz';
import { TicketScanner } from '@/components/organizer/TicketScanner';

export const dynamic = 'force-dynamic';

// Admin scanner mode: admins can scan tickets for any approved/published/
// completed event (scannableEvents returns all of them for admins).
export default async function AdminScannerPage() {
  const user = (await getCurrentUser())!;
  const events = await scannableEvents(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Admin scanner</h1>
      <TicketScanner
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          scannerEnabled: scannerEnabledForEvent(event),
        }))}
      />
    </div>
  );
}
