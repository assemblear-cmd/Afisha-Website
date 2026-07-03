import Link from 'next/link';
import clsx from 'clsx';

export type DayChip = {
  iso: string;
  day: string;
  month: string;
  weekday: string;
  isWeekend: boolean;
};

// Horizontal 7-day picker. The days are precomputed on the server so
// SSR and hydration agree. Each day opens the date-specific listings page.
export function DateStrip({
  days,
  ariaLabel,
  selectedIso,
}: {
  days: DayChip[];
  ariaLabel: string;
  selectedIso?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((d, i) => {
        const active = selectedIso ? d.iso === selectedIso : i === 0;
        return (
          <Link
            key={d.iso}
            href={`/calendario/${d.iso}`}
            aria-current={active ? 'date' : undefined}
            className={clsx(
              'flex min-w-[3.25rem] flex-col items-center rounded-lg px-3 py-1.5 leading-tight no-underline transition',
              active
                ? 'bg-coral text-white'
                : 'text-[#1E0A3C] hover:bg-surface dark:text-white dark:hover:bg-white/10'
            )}
          >
            <span className={clsx('text-lg font-extrabold', !active && d.isWeekend && 'text-coral')}>
              {d.day}
            </span>
            <span
              className={clsx(
                'text-[10px] uppercase',
                active ? 'text-white/80' : 'text-[#6F7287] dark:text-white/65'
              )}
            >
              {d.month}
            </span>
            <span
              className={clsx(
                'text-[10px] uppercase',
                active ? 'text-white/80' : d.isWeekend ? 'text-coral' : 'text-[#6F7287] dark:text-white/65'
              )}
            >
              {d.weekday}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
