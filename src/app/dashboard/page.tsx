import { redirect } from 'next/navigation';

// The organizer console is the single place to create and manage events, so the
// legacy /dashboard surface forwards there. Every logged-in user has access.
export default function DashboardPage() {
  redirect('/organizer/events');
}
