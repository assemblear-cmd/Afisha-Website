'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { formatPrice } from '@/lib/format';

interface TicketType {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  sold: number;
}

interface TicketSelectorProps {
  eventId: string;
  ticketTypes: TicketType[];
}

export function TicketSelector({ eventId, ticketTypes }: TicketSelectorProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0]))
  );

  function setQty(id: string, next: number) {
    setQuantities((prev) => ({ ...prev, [id]: next }));
  }

  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);

  const subtotalCents = ticketTypes.reduce(
    (sum, t) => sum + t.priceCents * (quantities[t.id] ?? 0),
    0
  );

  function handleCheckout() {
    const items = ticketTypes
      .filter((t) => (quantities[t.id] ?? 0) > 0)
      .map((t) => `${t.id}:${quantities[t.id]}`)
      .join(',');

    router.push(`/events/${eventId}/checkout?items=${encodeURIComponent(items)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {ticketTypes.map((ticket) => {
        const remaining = ticket.quantity - ticket.sold;
        const maxQty = Math.min(remaining, 10);
        const qty = quantities[ticket.id] ?? 0;
        const soldOut = remaining <= 0;

        return (
          <div key={ticket.id} className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink text-sm leading-tight">{ticket.name}</p>
              <p className="text-muted text-xs mt-0.5">
                {ticket.priceCents <= 0 ? 'Free' : formatPrice(ticket.priceCents)}
              </p>
            </div>

            {soldOut ? (
              <span className="text-xs font-medium text-muted bg-surface px-3 py-1.5 rounded-md">
                Sold out
              </span>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty(ticket.id, Math.max(0, qty - 1))}
                  disabled={qty === 0}
                  aria-label={`Decrease quantity for ${ticket.name}`}
                  className="w-8 h-8 rounded-md border border-ink/15 flex items-center justify-center text-ink font-bold hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold text-ink tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(ticket.id, Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  aria-label={`Increase quantity for ${ticket.name}`}
                  className="w-8 h-8 rounded-md border border-ink/15 flex items-center justify-center text-ink font-bold hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Subtotal */}
      {totalQty > 0 && (
        <div className="border-t border-ink/10 pt-3 flex justify-between items-center text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-semibold text-ink">
            {subtotalCents <= 0 ? 'Free' : formatPrice(subtotalCents)}
          </span>
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        disabled={totalQty === 0}
        onClick={handleCheckout}
      >
        Get tickets
      </Button>
    </div>
  );
}
