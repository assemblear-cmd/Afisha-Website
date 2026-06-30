import { Container } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getHomeNav } from '@/i18n/homeNav';
import { DateStrip, type DayChip } from './DateStrip';

const BCP47: Record<string, string> = { es: 'es-CL', en: 'en-US' };

// Build the next 7 days starting from "today" in America/Santiago, with labels
// localized to the active language. Computed on the server and passed to the
// client DateStrip so SSR and hydration agree.
function nextSevenDays(locale: string): DayChip[] {
  const tag = BCP47[locale] ?? 'es-CL';
  // "Today" as seen in Santiago, regardless of the server's own timezone.
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const base = new Date(`${todayIso}T12:00:00`); // noon avoids DST edges

  const dayFmt = new Intl.DateTimeFormat(tag, { day: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat(tag, { month: 'short' });
  const weekdayFmt = new Intl.DateTimeFormat(tag, { weekday: 'short' });
  const strip = (s: string) => s.replace(/\.$/, '');

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dow = d.getDay();
    return {
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: dayFmt.format(d),
      month: strip(monthFmt.format(d)),
      weekday: strip(weekdayFmt.format(d)),
      isWeekend: dow === 0 || dow === 6,
    };
  });
}

// "Where to go in Santiago" heading + the 7-day date picker.
export function WhereToGo() {
  const locale = getLocale();
  const nav = getHomeNav(locale);
  const days = nextSevenDays(locale);

  return (
    <section className="border-b border-ink/5 bg-canvas py-5">
      <Container>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="min-w-0 text-2xl font-extrabold leading-tight text-ink max-[360px]:text-[1.45rem] sm:text-3xl">
            {nav.whereToPrefix} <span className="text-coral">{nav.city}</span>
            <span aria-hidden className="ml-1 text-muted">
              ▾
            </span>
          </h1>
          <DateStrip days={days} ariaLabel={nav.pickDate} />
        </div>
      </Container>
    </section>
  );
}
