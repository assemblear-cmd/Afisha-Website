'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

export function PayoutActions({ payoutId, status }: { payoutId: string; status: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'start_review' | 'approve' | 'reject' | 'mark_paid') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
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
        aria-label="Payout notes"
      />
      {status === 'PENDING' && (
        <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('start_review')}>
          {busy === 'start_review' ? '…' : 'Start review'}
        </Button>
      )}
      {['PENDING', 'IN_REVIEW'].includes(status) && (
        <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run('approve')}>
          {busy === 'approve' ? '…' : 'Approve'}
        </Button>
      )}
      {['APPROVED', 'PROCESSING'].includes(status) && (
        <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run('mark_paid')}>
          {busy === 'mark_paid' ? '…' : 'Mark as paid'}
        </Button>
      )}
      {['PENDING', 'IN_REVIEW', 'APPROVED'].includes(status) && (
        <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run('reject')}>
          {busy === 'reject' ? '…' : 'Reject'}
        </Button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
