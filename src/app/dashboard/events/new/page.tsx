import { redirect } from 'next/navigation';

// Event creation now lives in the organizer console for every logged-in user.
export default function NewEventPage() {
  redirect('/organizer/events/new');
}
