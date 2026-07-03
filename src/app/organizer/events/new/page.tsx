import { EventForm } from '@/components/organizer/EventForm';

export const dynamic = 'force-dynamic';

export default function NewOrganizerEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Create event</h1>
      <p className="text-sm text-muted">
        Your event is saved as a draft first. Submit it for moderation when it&apos;s ready — it
        goes live on DondeGO after admin approval.
      </p>
      <EventForm mode="create" />
    </div>
  );
}
