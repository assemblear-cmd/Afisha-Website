import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminFinancePage() {
  const [totals, entries] = await Promise.all([
    prisma.ledgerTransaction.groupBy({
      by: ['type'],
      _sum: { amountClp: true },
      _count: { _all: true },
    }),
    prisma.ledgerTransaction.findMany({
      include: {
        organizer: { select: { email: true } },
        event: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Financial ledger</h1>
      <p className="text-sm text-muted">
        Internal CLP token ledger (1 token = 1 CLP) — the accounting source of truth for organizer
        balances. Credits positive, debits negative.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totals.map((row) => (
          <Card key={row.type} className="p-4">
            <p className="text-lg font-bold text-ink">{formatMoney(row._sum.amountClp ?? 0)}</p>
            <p className="text-xs text-muted">
              {row.type.replace(/_/g, ' ')} ({row._count._all})
            </p>
          </Card>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card className="p-8 text-center text-muted">No ledger entries yet.</Card>
      ) : (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {entry.type.replace(/_/g, ' ')}
                  {entry.event ? ` · ${entry.event.title}` : ''}
                </p>
                <p className="text-xs text-muted">
                  {entry.organizer.email} · {formatDateTime(entry.createdAt)}
                </p>
              </div>
              <span
                className={
                  entry.amountClp >= 0
                    ? 'shrink-0 font-bold text-green-700 dark:text-green-400'
                    : 'shrink-0 font-bold text-red-700 dark:text-red-400'
                }
              >
                {entry.amountClp >= 0 ? '+' : ''}
                {formatMoney(entry.amountClp)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
