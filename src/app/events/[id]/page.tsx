import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Container, Badge, Card } from '@/components/ui';
import { TicketSelector } from '@/components/events/TicketSelector';
import { categoryLabel } from '@/lib/categories';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: event?.title ?? 'Event' };
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      ticketTypes: true,
      organizer: { select: { id: true, name: true } },
    },
  });

  if (!event) notFound();

  const {
    id,
    title,
    description,
    category,
    venue,
    city,
    address,
    startsAt,
    endsAt,
    coverImage,
    organizer,
    ticketTypes,
  } = event;

  return (
    <main className="min-h-screen bg-surface pb-16">
      {/* Cover banner */}
      <div className="relative w-full aspect-[21/9] bg-gradient-to-br from-ink/80 to-coral/60 overflow-hidden">
        {coverImage && (
          <img
            src={coverImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}
      </div>

      <Container className="mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: main content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <Badge tone="coral" className="mb-3">
                {categoryLabel(category)}
              </Badge>
              <h1 className="text-3xl font-extrabold text-ink leading-tight">{title}</h1>
            </div>

            {/* Meta block */}
            <div className="flex flex-col gap-2 text-sm text-body">
              <div className="flex items-start gap-2">
                <span className="text-muted w-5 shrink-0">🗓</span>
                <span>
                  {formatDateTime(startsAt)}
                  {endsAt ? ` → ${formatDateTime(endsAt)}` : ''}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted w-5 shrink-0">📍</span>
                <span>
                  {venue}
                  {address ? `, ${address}` : ''}, {city}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted w-5 shrink-0">👤</span>
                <span>Organized by {organizer.name}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-ink mb-3">About this event</h2>
              <p className="text-body whitespace-pre-line leading-relaxed">{description}</p>
            </div>
          </div>

          {/* RIGHT: ticket sidebar */}
          <div className="lg:sticky lg:top-24 self-start">
            <Card className="p-5">
              <h2 className="text-lg font-bold text-ink mb-4">Tickets</h2>
              <TicketSelector eventId={id} ticketTypes={ticketTypes} />
            </Card>
          </div>
        </div>
      </Container>
    </main>
  );
}
