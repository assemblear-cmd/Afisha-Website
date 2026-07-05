const DISPLAY_TZ = 'America/Santiago';

export function santiagoDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysToKey(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function isDateKey(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function dateKeyRange(dateKey: string): { start: Date; endExclusive: Date } {
  return {
    start: new Date(`${dateKey}T00:00:00-04:00`),
    endExclusive: new Date(`${addDaysToKey(dateKey, 1)}T00:00:00-04:00`),
  };
}

export function weekendWindow(todayKey = santiagoDateKey(new Date())): { start: string; end: string } {
  const [year, month, day] = todayKey.split('-').map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  // Saturday–Sunday window: Monday–Friday jump ahead to the coming Saturday;
  // Saturday is itself the start; Sunday keeps the weekend that began Saturday.
  const daysUntilSaturday = dow === 0 ? -1 : 6 - dow;
  const start = addDaysToKey(todayKey, daysUntilSaturday);
  return { start, end: addDaysToKey(start, 1) };
}

export function weekendEventHref(): string {
  return '/fin-de-semana';
}

export function weekendDateRange(): { start: Date; endExclusive: Date } {
  const { start, end } = weekendWindow();
  return { start: dateKeyRange(start).start, endExclusive: dateKeyRange(end).endExclusive };
}
