import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminScansPage() {
  const scans = await prisma.ticketScan.findMany({
    include: {
      event: { select: { title: true } },
      scannedBy: { select: { email: true } },
      ticket: { select: { attendeeEmail: true, ticketType: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Scan history</h1>

      {scans.length === 0 ? (
        <Card className="p-8 text-center text-muted">No scans recorded yet.</Card>
      ) : (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {scan.event.title}
                  {scan.ticket ? ` · ${scan.ticket.ticketType.name}` : ' · no ticket matched'}
                </p>
                <p className="text-xs text-muted">
                  by {scan.scannedBy.email} · {formatDateTime(scan.createdAt)}
                  {scan.notes ? ` · ${scan.notes}` : ''}
                </p>
              </div>
              <StatusBadge status={scan.result} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
