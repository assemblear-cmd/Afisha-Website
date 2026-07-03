'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';

export function AccessManager({
  eventId,
  grants,
}: {
  eventId: string;
  grants: Array<{ id: string; email: string; status: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not grant access.');
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not grant access.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/access/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not revoke access.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke access.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={grant} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Staff email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Granting…' : 'Grant scanner access'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      {grants.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No scanner access granted yet.</Card>
      ) : (
        <div className="space-y-2">
          {grants.map((grantRow) => (
            <Card key={grantRow.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{grantRow.email}</p>
                <p className="text-xs text-muted">
                  Granted {new Date(grantRow.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={grantRow.status} />
                {grantRow.status !== 'REVOKED' && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => revoke(grantRow.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
