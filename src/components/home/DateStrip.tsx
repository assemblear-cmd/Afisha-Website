'use client';

import { useState } from 'react';
import clsx from 'clsx';

export type DayChip = {
  iso: string;
  day: string;
  month: string;
  weekday: string;
  isWeekend: boolean;
};

// Horizontal 7-day picker (today + 6). The days are precomputed on the server so
// SSR and the client agree (no hydration mismatch); this component only tracks
// which day is selected.
export function DateStrip({ days, ariaLabel }: { days: DayChip[]; ariaLabel: string }) {
  const [selected, setSelected] = useState(0);

  return (
    <div role="group" aria-label={ariaLabel} className="flex items-stretch gap-1 overflow-x-auto">
      {days.map((d, i) => {
        const active = i === selected;
        return (
          <button
            key={d.iso}
            type="button"
            onClick={() => setSelected(i)}
            aria-pressed={active}
            className={clsx(
              'flex min-w-[3.25rem] flex-col items-center rounded-lg px-3 py-1.5 leading-tight transition',
              active ? 'bg-coral text-white' : 'hover:bg-surface'
            )}
          >
            <span className={clsx('text-lg font-extrabold', !active && d.isWeekend && 'text-coral')}>
              {d.day}
            </span>
            <span className={clsx('text-[10px] uppercase', active ? 'text-white/80' : 'text-muted')}>
              {d.month}
            </span>
            <span
              className={clsx(
                'text-[10px] uppercase',
                active ? 'text-white/80' : d.isWeekend ? 'text-coral' : 'text-muted'
              )}
            >
              {d.weekday}
            </span>
          </button>
        );
      })}
    </div>
  );
}
