import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { Container, Card, LinkButton } from '@/components/ui';
import { CreateEventForm } from '@/components/events/CreateEventForm';

export const metadata: Metadata = { title: 'Create event' };

export default async function NewEventPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/dashboard/events/new');
  }

  if (user.role !== 'organizer') {
    return (
      <Container className="py-16 max-w-lg text-center">
        <Card className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-ink">Organizer access required</h1>
          <p className="text-body">
            Your account is a visitor account. Register an organizer account to create events.
          </p>
          <LinkButton href="/register" variant="primary">
            Register as organizer
          </LinkButton>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-ink mb-8">Create an event</h1>
      <CreateEventForm />
    </Container>
  );
}
