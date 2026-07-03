'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input } from '@/components/ui';

// Admin moderation controls. Which buttons show depends on the current
// status; the server re-validates every transition.

const ACTIONS_BY_STATUS: Record<string, Array<{ action: string; label: string }>> = {
  SUBMITTED: [
    { action: 'approve', label: 'Publish' },
    { action: 'reject', label: 'Reject' },
    { action: 'archive', label: 'Archive' },
  ],
  IN_REVIEW: [
    { action: 'approve', label: 'Publish' },
    { action: 'reject', label: 'Reject' },
    { action: 'archive', label: 'Archive' },
  ],
  APPROVED: [
    { action: 'approve', label: 'Publish' },
    { action: 'reject', label: 'Reject' },
  ],
  PUBLISHED: [
    { action: 'complete', label: 'Mark completed' },
    { action: 'archive', label: 'Archive' },
  ],
  REJECTED: [{ action: 'archive', label: 'Archive' }],
  DRAFT: [{ action: 'archive', label: 'Archive' }],
};

export function ModerationActions({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = ACTIONS_BY_STATUS[status] ?? [];

  async function run(action: string) {
    if (action === 'reject' && !notes.trim()) {
      setError('A rejection reason is required — fill the notes field.');
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/moderate`, {
        method: 'POST',
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

  if (actions.length === 0) {
    return <Card className="p-4 text-sm text-muted">No moderation actions for status {status}.</Card>;
  }

  return (
    <Card className="space-y-3 p-5">
      <Field label="Notes (required for rejection, shown to the organizer)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason / comment" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ action, label }) => (
          <Button
            key={action}
            variant={action === 'reject' || action === 'archive' ? 'secondary' : 'primary'}
            size="sm"
            disabled={busy !== null}
            onClick={() => run(action)}
          >
            {busy === action ? 'Working…' : label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  );
}
