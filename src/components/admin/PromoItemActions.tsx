'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

export function PromoItemActions({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'approve' | 'reject' | 'fulfill') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/promotions/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Action failed.');
      setNotes('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="max-w-56 py-1 text-sm"
        aria-label="Moderation notes"
      />
      {['PENDING_REVIEW', 'PAID'].includes(status) && (
        <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run('approve')}>
          {busy === 'approve' ? '…' : 'Approve'}
        </Button>
      )}
      {['APPROVED', 'PENDING_REVIEW'].includes(status) && (
        <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('fulfill')}>
          {busy === 'fulfill' ? '…' : 'Mark fulfilled'}
        </Button>
      )}
      <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('reject')}>
        {busy === 'reject' ? '…' : 'Reject'}
      </Button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
