'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/money';

// Organizer-facing promotion purchase: pick one of the 7 homepage tiles with
// a date + hourly slot + duration (price shown live, discounts applied), add
// promo services, pay everything in one Stripe Checkout.

type Tile = {
  id: string;
  position: number;
  name: string;
  description: string;
  hourlyPriceClp: number;
};

type Service = { code: string; name: string; description: string; priceClp: number };

type Quote = {
  quote: {
    hours: number;
    basePriceClp: number;
    discountPct: number;
    totalPriceClp: number;
  };
  available: boolean;
  conflict: { startAt: string; endAt: string } | null;
};

const DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 3, label: '3 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours (−10%)' },
  { hours: 24, label: '24 hours (−15%)' },
  { hours: 48, label: '48 hours (−25%)' },
  { hours: 168, label: '1 week (−40%)' },
];

export function PromotionBuilder({
  eventId,
  isFree,
  scannerAddonPaid,
  tiles,
  services,
}: {
  eventId: string;
  isFree: boolean;
  scannerAddonPaid: boolean;
  tiles: Tile[];
  services: Service[];
}) {
  const [tileId, setTileId] = useState<string>('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('12');
  const [hours, setHours] = useState(24);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleServices = services.filter((service) =>
    service.code === 'scanner_addon' ? isFree && !scannerAddonPaid : true
  );

  const startAtIso = useMemo(() => {
    if (!date) return null;
    const local = new Date(`${date}T${hour.padStart(2, '0')}:00:00`);
    return isNaN(local.getTime()) ? null : local.toISOString();
  }, [date, hour]);

  const fetchQuote = useCallback(async () => {
    if (!tileId || !startAtIso) {
      setQuote(null);
      return;
    }
    try {
      const res = await fetch('/api/promotions/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tileId, startAt: startAtIso, hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Quote failed.');
      setQuote(data);
      setError(null);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : 'Quote failed.');
    }
  }, [tileId, startAtIso, hours]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const servicesTotal = visibleServices
    .filter((service) => selectedServices.includes(service.code))
    .reduce((sum, service) => sum + service.priceClp, 0);
  const tileTotal = tileId && quote?.available ? quote.quote.totalPriceClp : 0;
  const total = tileTotal + servicesTotal;

  function toggleService(code: string) {
    setSelectedServices((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/promotions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          tile: tileId && startAtIso ? { tileId, startAt: startAtIso, hours } : undefined,
          serviceCodes: selectedServices,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed.');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold text-ink">Homepage tile</h2>
        <p className="mb-4 text-sm text-muted">
          7 ad slots on the DondeGO homepage. Price is per hour; longer bookings get discounts
          (12h −10%, 24h −15%, 48h −25%, 1 week −40%). Placements go live after payment and admin
          approval.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setTileId('')}
            className={clsx(
              'rounded border p-3 text-left text-sm transition',
              tileId === ''
                ? 'border-coral bg-coral/10'
                : 'border-black/10 hover:border-coral dark:border-white/15'
            )}
          >
            <p className="font-semibold text-ink">No tile</p>
            <p className="text-xs text-muted">Services only</p>
          </button>
          {tiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => setTileId(tile.id)}
              className={clsx(
                'rounded border p-3 text-left text-sm transition',
                tileId === tile.id
                  ? 'border-coral bg-coral/10'
                  : 'border-black/10 hover:border-coral dark:border-white/15'
              )}
            >
              <p className="font-semibold text-ink">{tile.name}</p>
              <p className="text-xs text-muted">{formatMoney(tile.hourlyPriceClp)}/hour</p>
            </button>
          ))}
        </div>

        {tileId && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start hour">
              <Select value={hour} onChange={(e) => setHour(e.target.value)}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i)}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duration">
              <Select value={String(hours)} onChange={(e) => setHours(Number(e.target.value))}>
                {DURATIONS.map((duration) => (
                  <option key={duration.hours} value={String(duration.hours)}>
                    {duration.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {tileId && quote && (
          <div className="mt-4 text-sm">
            {quote.available ? (
              <p className="text-body">
                Slot available ·{' '}
                <span className="font-bold text-ink">{formatMoney(quote.quote.totalPriceClp)}</span>
                {quote.quote.discountPct > 0 && (
                  <span className="text-muted">
                    {' '}
                    ({formatMoney(quote.quote.basePriceClp)} − {quote.quote.discountPct}%)
                  </span>
                )}
              </p>
            ) : (
              <p className="font-semibold text-red-600 dark:text-red-400">
                This tile is already booked for an overlapping period. Pick another slot or tile.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold text-ink">Promo services</h2>
        <p className="mb-4 text-sm text-muted">Optional extras, moderated by DondeGO after payment.</p>
        <div className="space-y-2">
          {visibleServices.map((service) => (
            <label
              key={service.code}
              className="flex cursor-pointer items-center justify-between gap-3 rounded border border-black/10 p-3 text-sm dark:border-white/15"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.code)}
                  onChange={() => toggleService(service.code)}
                />
                <span>
                  <span className="block font-semibold text-ink">{service.name}</span>
                  <span className="block text-xs text-muted">{service.description}</span>
                </span>
              </span>
              <span className="shrink-0 font-semibold text-ink">{formatMoney(service.priceClp)}</span>
            </label>
          ))}
        </div>
        {isFree && scannerAddonPaid && (
          <p className="mt-3 text-xs text-muted">Scanner add-on is already active for this event.</p>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted">Total</p>
          <p className="text-xl font-bold text-ink">{formatMoney(total)}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
          <Button
            variant="primary"
            disabled={busy || total <= 0 || (!!tileId && !quote?.available)}
            onClick={checkout}
          >
            {busy ? 'Redirecting…' : 'Pay with Stripe'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
