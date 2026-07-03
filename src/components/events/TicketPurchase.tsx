'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@/components/ui';
import { formatMoney, formatTicketPrice } from '@/lib/money';

// Public ticket purchase widget for the new checkout: free orders confirm
// instantly, paid orders redirect to Stripe Checkout. Prices are display-only
// here — the server recomputes everything from DB rows.

type PurchasableTicketType = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  remaining: number;
  perOrderLimit: number | null;
};

export function TicketPurchase({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: PurchasableTicketType[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((tt) => [tt.id, 0]))
  );
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = ticketTypes[0]?.currency ?? 'CLP';
  const totalQty = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const total = ticketTypes.reduce(
    (sum, tt) => sum + tt.priceCents * (quantities[tt.id] ?? 0),
    0
  );

  function setQty(id: string, next: number) {
    setQuantities((prev) => ({ ...prev, [id]: next }));
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          buyerName,
          buyerEmail,
          items: Object.entries(quantities).map(([ticketTypeId, quantity]) => ({
            ticketTypeId,
            quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed.');
      if (data.free) {
        router.push(`/checkout/result?order=${data.orderId}&outcome=success`);
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
      setBusy(false);
    }
  }

  if (ticketTypes.length === 0) {
    return <p className="text-sm text-muted">Tickets are not on sale yet.</p>;
  }

  return (
    <form onSubmit={checkout} className="flex flex-col gap-4">
      {ticketTypes.map((tt) => {
        const soldOut = tt.remaining <= 0;
        const maxQty = Math.min(tt.remaining, tt.perOrderLimit ?? 10, 10);
        const qty = quantities[tt.id] ?? 0;
        return (
          <div key={tt.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-ink">{tt.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatTicketPrice(tt.priceCents, tt.currency)}
                {soldOut ? ' · Sold out' : tt.remaining <= 10 ? ` · ${tt.remaining} left` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                aria-label={`Fewer ${tt.name}`}
                disabled={qty <= 0}
                onClick={() => setQty(tt.id, Math.max(0, qty - 1))}
              >
                −
              </Button>
              <span className="w-6 text-center text-sm font-semibold text-ink">{qty}</span>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`More ${tt.name}`}
                disabled={soldOut || qty >= maxQty}
                onClick={() => setQty(tt.id, qty + 1)}
              >
                +
              </Button>
            </div>
          </div>
        );
      })}

      {totalQty > 0 && (
        <>
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <p className="flex items-center justify-between text-sm">
              <span className="text-muted">Total</span>
              <span className="font-bold text-ink">
                {total === 0 ? 'Free' : formatMoney(total, currency)}
              </span>
            </p>
          </div>
          <Field label="Your name">
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required minLength={2} />
          </Field>
          <Field label="Email (tickets are linked to it)">
            <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required />
          </Field>
        </>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="primary" disabled={busy || totalQty === 0}>
        {busy ? 'Processing…' : total === 0 ? 'Get free tickets' : 'Pay with Stripe'}
      </Button>
    </form>
  );
}
