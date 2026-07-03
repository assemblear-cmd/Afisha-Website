'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { StatusBadge } from '@/components/organizer/StatusBadge';
import { formatTicketPrice } from '@/lib/money';

export type TicketTypeRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  perOrderLimit: number | null;
  salesStartAt: string;
  salesEndAt: string;
  status: string;
};

const STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED'];

export function TicketTypeManager({
  eventId,
  isFree,
  editable = true,
  ticketTypes,
}: {
  eventId: string;
  isFree: boolean;
  editable?: boolean;
  ticketTypes: TicketTypeRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: isFree ? '0' : '',
    quantity: '',
    perOrderLimit: '',
    salesStartAt: '',
    salesEndAt: '',
  });

  async function callApi(url: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Request failed.');
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createTicketType(e: React.FormEvent) {
    e.preventDefault();
    const ok = await callApi(`/api/organizer/events/${eventId}/ticket-types`, 'POST', {
      name: form.name,
      description: form.description,
      price: Number(form.price || 0),
      currency: 'CLP',
      quantity: Number(form.quantity || 0),
      perOrderLimit: form.perOrderLimit ? Number(form.perOrderLimit) : undefined,
      salesStartAt: form.salesStartAt,
      salesEndAt: form.salesEndAt,
      status: 'ACTIVE',
    });
    if (ok) {
      setForm({
        name: '',
        description: '',
        price: isFree ? '0' : '',
        quantity: '',
        perOrderLimit: '',
        salesStartAt: '',
        salesEndAt: '',
      });
    }
  }

  return (
    <div className="space-y-6">
      {ticketTypes.length === 0 ? (
        <Card className="p-8 text-center text-muted">No ticket types yet — add one below.</Card>
      ) : (
        <div className="space-y-3">
          {ticketTypes.map((tt) => (
            <Card key={tt.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{tt.name}</p>
                  <p className="text-sm text-muted">
                    {formatTicketPrice(tt.price, tt.currency)} · {tt.sold}/{tt.quantity} sold
                    {tt.perOrderLimit ? ` · max ${tt.perOrderLimit}/order` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={tt.status} />
                  <Select
                    aria-label={`Change status of ${tt.name}`}
                    value={tt.status}
                    className="w-36"
                    disabled={busy || !editable}
                    onChange={(e) =>
                      callApi(`/api/organizer/ticket-types/${tt.id}`, 'PATCH', {
                        status: e.target.value,
                      })
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!editable && (
        <Card className="p-4 text-sm text-muted">
          Ticket editing is locked after the event is sent to moderation.
        </Card>
      )}

      {editable && (
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-bold text-ink">Add ticket type</h2>
        <form onSubmit={createTicketType} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label={isFree ? 'Price (free event — fixed at 0)' : 'Price (CLP)'}>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                disabled={isFree}
                required
              />
            </Field>
          </div>
          <Field label="Description (optional)">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                step={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </Field>
            <Field label="Per-order limit (optional)">
              <Input
                type="number"
                min={1}
                step={1}
                value={form.perOrderLimit}
                onChange={(e) => setForm({ ...form, perOrderLimit: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sales start (optional)">
              <Input
                type="datetime-local"
                value={form.salesStartAt}
                onChange={(e) => setForm({ ...form, salesStartAt: e.target.value })}
              />
            </Field>
            <Field label="Sales end (optional)">
              <Input
                type="datetime-local"
                value={form.salesEndAt}
                onChange={(e) => setForm({ ...form, salesEndAt: e.target.value })}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add ticket type'}
          </Button>
        </form>
      </Card>
      )}
    </div>
  );
}
