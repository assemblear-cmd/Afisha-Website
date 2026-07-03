'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function TicketAdminActions({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'invalidate' | 'cancel') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Action failed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('invalidate')}>
        {busy === 'invalidate' ? '…' : 'Invalidate'}
      </Button>
      <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('cancel')}>
        {busy === 'cancel' ? '…' : 'Cancel'}
      </Button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
