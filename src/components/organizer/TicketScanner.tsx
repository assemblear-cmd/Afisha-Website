'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import jsQR from 'jsqr';
import { Button, Card, Field, Input, Select } from '@/components/ui';

// Camera QR scanner with server-side verification. Decoding prefers the
// native BarcodeDetector API (Chrome/Android) and falls back to jsQR frame
// sampling elsewhere (Safari/iOS). Manual token input is always available.

type ScannerEvent = {
  id: string;
  title: string;
  startsAt: string;
  scannerEnabled: boolean;
};

type ScanOutcome = {
  result: string;
  message: string;
  ticket?: {
    id: string;
    attendeeName: string | null;
    ticketTypeName: string;
    eventTitle: string;
    checkedInAt: string | null;
  };
};

// Minimal typing for the native BarcodeDetector (not in TS dom lib yet).
type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => NativeBarcodeDetector;
  }
}

const RESULT_TONES: Record<string, string> = {
  VALID: 'border-green-500 bg-green-50 dark:bg-green-900/30',
  ALREADY_USED: 'border-amber-500 bg-amber-50 dark:bg-amber-900/30',
};

export function TicketScanner({ events }: { events: ScannerEvent[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [history, setHistory] = useState<Array<ScanOutcome & { at: string }>>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastValueRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const busyRef = useRef(false);

  const selectedEvent = events.find((event) => event.id === eventId);

  const verify = useCallback(
    async (value: string) => {
      if (busyRef.current || !eventId) return;
      // Debounce: the camera sees the same QR ~10x/sec — verify once per 3s.
      const now = Date.now();
      if (lastValueRef.current.value === value && now - lastValueRef.current.at < 3000) return;
      lastValueRef.current = { value, at: now };

      busyRef.current = true;
      setBusy(true);
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, value }),
        });
        const data = await res.json();
        const result: ScanOutcome = res.ok
          ? data
          : { result: 'INVALID', message: data.error ?? 'Scan failed.' };
        setOutcome(result);
        setHistory((prev) => [{ ...result, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 15));
      } catch {
        setOutcome({ result: 'INVALID', message: 'Network error — try again.' });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId]
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const detector = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ['qr_code'] })
        : null;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      let lastSample = 0;

      const tick = async (timestamp: number) => {
        if (!streamRef.current) return;
        // Sample ~4 frames per second; decoding every frame wastes CPU.
        if (timestamp - lastSample > 250 && video.readyState === video.HAVE_ENOUGH_DATA) {
          lastSample = timestamp;
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) verify(codes[0].rawValue);
            } else if (context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(image.data, image.width, image.height);
              if (code?.data) verify(code.data);
            }
          } catch {
            // Ignore per-frame decode errors and keep scanning.
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        'Could not access the camera. Allow camera permission or use manual token input below.'
      );
      setScanning(false);
    }
  }, [verify]);

  useEffect(() => stopCamera, [stopCamera]);
  // Switching events invalidates the debounce so the same QR can be re-checked.
  useEffect(() => {
    lastValueRef.current = { value: '', at: 0 };
    setOutcome(null);
  }, [eventId]);

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center text-muted">
        No events available for scanning. You can scan events you organize or events where you were
        granted staff access.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <Field label="Event">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} — {new Date(event.startsAt).toLocaleDateString()}
              </option>
            ))}
          </Select>
        </Field>

        {selectedEvent && !selectedEvent.scannerEnabled && (
          <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
            Scanning is disabled for this free event. Purchase the scanner add-on (CLP 20,000) on
            the event&apos;s Promotion page to enable check-in.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Camera</h2>
          {scanning ? (
            <Button variant="secondary" size="sm" onClick={stopCamera}>
              Stop camera
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={startCamera}
              disabled={!selectedEvent?.scannerEnabled}
            >
              Start camera
            </Button>
          )}
        </div>
        <video
          ref={videoRef}
          muted
          playsInline
          className={clsx(
            'mt-3 w-full rounded bg-black/80',
            scanning ? 'aspect-video' : 'hidden'
          )}
        />
        {cameraError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cameraError}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Manual input</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualValue.trim()) {
              lastValueRef.current = { value: '', at: 0 };
              verify(manualValue.trim());
              setManualValue('');
            }
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-64 flex-1">
            <Field label="Ticket token (fallback when the camera can't read the QR)">
              <Input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="DGO1.… or raw token"
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={busy || !selectedEvent?.scannerEnabled}>
            {busy ? 'Checking…' : 'Verify'}
          </Button>
        </form>
      </Card>

      {outcome && (
        <Card
          className={clsx(
            'border-2 p-5',
            RESULT_TONES[outcome.result] ?? 'border-red-500 bg-red-50 dark:bg-red-900/30'
          )}
        >
          <p className="text-xl font-extrabold text-ink">{outcome.result.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-sm text-body">{outcome.message}</p>
          {outcome.ticket && (
            <p className="mt-2 text-sm text-body">
              {outcome.ticket.ticketTypeName}
              {outcome.ticket.attendeeName ? ` · ${outcome.ticket.attendeeName}` : ''} ·{' '}
              {outcome.ticket.eventTitle}
            </p>
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card className="divide-y divide-black/5 p-0 dark:divide-white/10">
          {history.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="text-muted">{entry.at}</span>
              <span className="min-w-0 flex-1 truncate px-2 text-body">
                {entry.ticket ? `${entry.ticket.ticketTypeName} · ${entry.ticket.attendeeName ?? ''}` : entry.message}
              </span>
              <span
                className={clsx(
                  'font-bold',
                  entry.result === 'VALID'
                    ? 'text-green-700 dark:text-green-400'
                    : entry.result === 'ALREADY_USED'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-red-700 dark:text-red-400'
                )}
              >
                {entry.result.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
