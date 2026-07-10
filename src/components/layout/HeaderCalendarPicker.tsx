'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { Locale } from '@/i18n/config';
import { isDateKey } from '@/lib/weekend';

type HeaderCalendarPickerProps = {
  buttonClassName?: string;
  className?: string;
  label: string;
  locale: Locale;
};

type CalendarCell = {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  key: string;
};

const DISPLAY_TZ = 'America/Santiago';
const LOCALE_TAGS: Record<Locale, string> = { es: 'es-CL', en: 'en-US' };

const COPY: Record<
  Locale,
  {
    apply: string;
    nextMonth: string;
    previousMonth: string;
    weekdays: string[];
  }
> = {
  es: {
    apply: 'Aplicar',
    nextMonth: 'Mes siguiente',
    previousMonth: 'Mes anterior',
    weekdays: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
  },
  en: {
    apply: 'Apply',
    nextMonth: 'Next month',
    previousMonth: 'Previous month',
    weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  },
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 9h18" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function keyFromDate(date: Date): string {
  return dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function santiagoTodayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: DISPLAY_TZ,
    year: 'numeric',
  }).format(new Date());
}

function keyFromPath(pathname: string | null): string | null {
  const match = pathname?.match(/^\/calendario\/(\d{4}-\d{2}-\d{2})(?:\/|$)/);
  return isDateKey(match?.[1]) ? match[1] : null;
}

function monthStartFromKey(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

function shiftMonth(monthStart: Date, delta: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + delta, 1, 12));
}

function monthTitle(monthStart: Date, locale: Locale): string {
  const tag = LOCALE_TAGS[locale];
  const month = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' }).format(monthStart);
  const year = new Intl.DateTimeFormat(tag, { timeZone: 'UTC', year: 'numeric' }).format(monthStart);
  const title = `${month} ${year}`;

  return title.charAt(0).toLocaleUpperCase(tag) + title.slice(1);
}

function dateLabel(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(`${key}T12:00:00Z`));
}

function buildMonthCells(monthStart: Date, todayKey: string): CalendarCell[] {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const cellsCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellsCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month, 1 - mondayOffset + index, 12));
    const key = keyFromDate(date);

    return {
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: key === todayKey,
      key,
    };
  });
}

export function HeaderCalendarPicker({
  buttonClassName = 'grid h-10 w-10 place-items-center rounded-full text-[#39364F] transition hover:bg-[#F8F7FA] hover:text-coral',
  className,
  label,
  locale,
}: HeaderCalendarPickerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const todayKey = useMemo(() => santiagoTodayKey(), []);
  const copy = COPY[locale] ?? COPY.es;
  const pathKey = keyFromPath(pathname) ?? todayKey;
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(pathKey);
  const [monthStart, setMonthStart] = useState(() => monthStartFromKey(pathKey));
  const cells = useMemo(() => buildMonthCells(monthStart, todayKey), [monthStart, todayKey]);

  useEffect(() => {
    if (open) return;
    setSelectedKey(pathKey);
    setMonthStart(monthStartFromKey(pathKey));
  }, [open, pathKey]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function openPicker() {
    const currentKey = keyFromPath(pathname) ?? todayKey;
    setSelectedKey(currentKey);
    setMonthStart(monthStartFromKey(currentKey));
    setOpen(true);
  }

  function applyDate() {
    setOpen(false);
    router.push(`/calendario/${selectedKey}`);
  }

  return (
    <div ref={ref} className={clsx('relative shrink-0', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={buttonClassName}
      >
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-[1.65rem] border border-black/[0.06] bg-white/95 p-5 text-neutral-950 shadow-[0_24px_70px_-18px_rgba(30,10,60,0.42)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/95 dark:text-white dark:shadow-[0_28px_80px_-18px_rgba(0,0,0,0.75)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[21.5rem] sm:p-6"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label={copy.previousMonth}
              onClick={() => setMonthStart((month) => shiftMonth(month, -1))}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ChevronIcon direction="left" />
            </button>
            <p className="text-center text-lg font-semibold tracking-tight sm:text-xl">
              {monthTitle(monthStart, locale)}
            </p>
            <button
              type="button"
              aria-label={copy.nextMonth}
              onClick={() => setMonthStart((month) => shiftMonth(month, 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7">
            {copy.weekdays.map((weekday, index) => (
              <span
                key={weekday}
                className={clsx(
                  'text-center text-[0.68rem] font-semibold uppercase tracking-[0.09em]',
                  index >= 5
                    ? 'text-coral/80'
                    : 'text-neutral-400 dark:text-white/45'
                )}
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-7 gap-y-1.5">
            {cells.map((cell) => {
              const selected = cell.key === selectedKey;
              const today = cell.isToday && !selected;

              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={dateLabel(cell.key, locale)}
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedKey(cell.key);
                    if (!cell.inMonth) setMonthStart(monthStartFromKey(cell.key));
                  }}
                  className={clsx(
                    'relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[0.95rem] font-medium leading-none tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
                    'after:absolute after:bottom-1.5 after:h-1 after:w-1 after:rounded-full after:transition-colors',
                    selected
                      ? 'bg-coral font-semibold text-white shadow-[0_10px_22px_-6px_rgba(226,27,45,0.6)] after:bg-transparent'
                      : today
                        ? 'font-semibold text-coral hover:bg-coral/10 after:bg-coral dark:hover:bg-coral/20'
                        : cell.inMonth
                          ? 'text-neutral-800 hover:bg-neutral-100 after:bg-transparent dark:text-white/90 dark:hover:bg-white/10'
                          : 'text-neutral-300 hover:bg-neutral-100 after:bg-transparent dark:text-white/25 dark:hover:bg-white/5'
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={applyDate}
            className="mt-6 h-12 w-full rounded-2xl bg-neutral-950 text-[0.95rem] font-semibold tracking-tight text-white shadow-[0_12px_30px_-12px_rgba(30,10,60,0.55)] transition hover:bg-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 dark:bg-white dark:text-neutral-950 dark:shadow-none dark:hover:bg-coral dark:hover:text-white dark:focus-visible:ring-offset-neutral-900"
          >
            {copy.apply}
          </button>
        </div>
      )}
    </div>
  );
}
