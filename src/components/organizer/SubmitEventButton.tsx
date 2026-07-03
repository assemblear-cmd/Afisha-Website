'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function SubmitEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/submit`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not submit the event.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the event.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      <Button onClick={submit} disabled={busy} variant="primary" size="sm">
        {busy ? 'Submitting…' : 'Publish'}
      </Button>
    </div>
  );
}
