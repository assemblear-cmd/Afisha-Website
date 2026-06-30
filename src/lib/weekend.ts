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

export function weekendWindow(todayKey = santiagoDateKey(new Date())): { start: string; end: string } {
  const [year, month, day] = todayKey.split('-').map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysUntilSaturday = dow === 0 ? -1 : dow === 6 ? 0 : 6 - dow;
  const start = addDaysToKey(todayKey, daysUntilSaturday);
  return { start, end: addDaysToKey(start, 1) };
}

export function weekendEventHref(): string {
  return '/events?period=weekend';
}

export function weekendDateRange(): { start: Date; endExclusive: Date } {
  const { start, end } = weekendWindow();
  return {
    start: new Date(`${start}T00:00:00-04:00`),
    endExclusive: new Date(`${addDaysToKey(end, 1)}T00:00:00-04:00`),
  };
}
