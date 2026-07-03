'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export function PayoutRequestButton({
  eventId,
  availableClp,
}: {
  eventId: string;
  availableClp: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(availableClp));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/organizer/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, amountClp: Number(amount), notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not create the payout request.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the payout request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={request} className="space-y-3">
      <p className="text-sm text-body">
        Available: <span className="font-bold text-ink">{formatMoney(availableClp)}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount (CLP)">
          <Input
            type="number"
            min={1}
            max={availableClp}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Notes (optional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank details, etc." />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Requesting…' : 'Request payout'}
      </Button>
    </form>
  );
}

export function CancelPayoutButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/payouts/${payoutId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not cancel the payout.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the payout.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <Button variant="secondary" size="sm" disabled={busy} onClick={cancel}>
        {busy ? 'Cancelling…' : 'Cancel'}
      </Button>
    </span>
  );
}
