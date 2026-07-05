import { redirect } from 'next/navigation';

// The per-event organizer dashboard is the canonical management view.
export default function EventDashboardPage({ params }: { params: { id: string } }) {
  redirect(`/organizer/events/${params.id}`);
}
