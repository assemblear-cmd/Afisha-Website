import { getCurrentUser } from '@/lib/auth';
import { scannableEvents, scannerEnabledForEvent } from '@/lib/authz';
import { TicketScanner } from '@/components/organizer/TicketScanner';

export const dynamic = 'force-dynamic';

export default async function OrganizerScannerPage() {
  const user = (await getCurrentUser())!;
  const events = await scannableEvents(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Ticket scanner</h1>
      <p className="text-sm text-muted">
        Point the camera at the attendee&apos;s QR code, or type the ticket token manually. Every
        scan is verified server-side and recorded in the scan history.
      </p>
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
