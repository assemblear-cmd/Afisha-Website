import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { qrPayloadForToken } from '@/lib/tickets/tokens';
import { formatDateTime } from '@/lib/format';
import { Card, Container } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

// The QR encodes only the random ticket token (no personal data); staff scan
// it in the in-app scanner, which verifies against the DB server-side.
export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/account/tickets/${params.id}`);

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      event: { select: { title: true, startsAt: true, venue: true, address: true, city: true } },
      ticketType: { select: { name: true } },
      order: { select: { buyerEmail: true, userId: true } },
    },
  });
  if (!ticket) notFound();

  const owns =
    ticket.ownerUserId === user.id ||
    ticket.order.userId === user.id ||
    ticket.order.buyerEmail.toLowerCase() === user.email.toLowerCase() ||
    user.role === 'admin';
  if (!owns) notFound();

  const qrSvg = await QRCode.toString(qrPayloadForToken(ticket.token), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
  });

  return (
    <Container className="max-w-lg py-10">
      <Card className="space-y-4 p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-ink">{ticket.event.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {ticket.ticketType.name} · {formatDateTime(ticket.event.startsAt)}
          </p>
          <p className="text-sm text-muted">
            {ticket.event.venue}, {ticket.event.address}, {ticket.event.city}
          </p>
        </div>

        <div className="flex justify-center">
          <StatusBadge status={ticket.status} />
        </div>

        {ticket.status === 'ISSUED' || ticket.status === 'CHECKED_IN' ? (
          <>
            <div
              className="mx-auto w-64 max-w-full rounded bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
              // QR SVG is generated server-side by the qrcode library from our
              // own token — no user-controlled markup.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="break-all text-xs text-muted">
              Manual code: {qrPayloadForToken(ticket.token)}
            </p>
            {ticket.status === 'CHECKED_IN' && ticket.checkedInAt && (
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Checked in at {formatDateTime(ticket.checkedInAt)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            This ticket is {ticket.status.toLowerCase()} — the QR code is disabled.
          </p>
        )}
      </Card>
    </Container>
  );
}
