import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/authz';
import { AccessManager } from '@/components/organizer/AccessManager';

export const dynamic = 'force-dynamic';

export default async function OrganizerAccessPage({ params }: { params: { id: string } }) {
  const user = (await getCurrentUser())!;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { scannerAccesses: { orderBy: { createdAt: 'desc' } } },
  });
  if (!event || (!isAdmin(user) && event.organizerId !== user.id)) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Scanner access — {event.title}</h1>
      <p className="text-sm text-muted">
        Grant door staff access by email. They log in with that email and can scan tickets for this
        event only. If they don&apos;t have an account yet, the invitation links automatically when
        they first open the scanner.
      </p>

      <AccessManager
        eventId={event.id}
        grants={event.scannerAccesses.map((grant) => ({
          id: grant.id,
          email: grant.email,
          status: grant.status,
          createdAt: grant.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
