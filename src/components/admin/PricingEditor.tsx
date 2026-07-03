'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';

type TileRow = { id: string; name: string; position: number; hourlyPriceClp: number };
type ServiceRow = { id: string; name: string; code: string; priceClp: number };

export function PricingEditor({ tiles, services }: { tiles: TileRow[]; services: ServiceRow[] }) {
  const router = useRouter();
  const [tilePrices, setTilePrices] = useState(
    Object.fromEntries(tiles.map((tile) => [tile.id, String(tile.hourlyPriceClp)]))
  );
  const [servicePrices, setServicePrices] = useState(
    Object.fromEntries(services.map((service) => [service.id, String(service.priceClp)]))
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiles: tiles.map((tile) => ({ id: tile.id, hourlyPriceClp: Number(tilePrices[tile.id]) })),
          services: services.map((service) => ({
            id: service.id,
            priceClp: Number(servicePrices[service.id]),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save pricing.');
      setMessage('Pricing saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save pricing.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Homepage tiles (CLP per hour)</h2>
        <div className="space-y-2">
          {tiles.map((tile) => (
            <label key={tile.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-body">{tile.name}</span>
              <Input
                type="number"
                min={1}
                step={1}
                className="max-w-36"
                value={tilePrices[tile.id]}
                onChange={(e) => setTilePrices({ ...tilePrices, [tile.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Promo services (CLP)</h2>
        <div className="space-y-2">
          {services.map((service) => (
            <label key={service.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-body">
                {service.name} <span className="text-muted">({service.code})</span>
              </span>
              <Input
                type="number"
                min={1}
                step={1}
                className="max-w-36"
                value={servicePrices[service.id]}
                onChange={(e) => setServicePrices({ ...servicePrices, [service.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save pricing'}
        </Button>
        {message && <span className="text-sm text-green-700 dark:text-green-400">{message}</span>}
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}
