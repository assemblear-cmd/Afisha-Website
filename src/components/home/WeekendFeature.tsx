import Link from 'next/link';
import { Container } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getHomeNav } from '@/i18n/homeNav';
import { weekendEventHref, weekendWindow } from '@/lib/weekend';

const BCP47: Record<string, string> = { es: 'es-CL', en: 'en-US' };

function weekendDayParts(iso: string, locale: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  const tag = BCP47[locale] ?? 'es-CL';
  const strip = (s: string) => s.replace(/\.$/, '');

  return {
    day: new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: 'UTC' }).format(date),
    month: strip(new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'UTC' }).format(date)),
  };
}

export function WeekendFeature() {
  const locale = getLocale();
  const nav = getHomeNav(locale);
  const weekend = weekendWindow();
  const weekendStart = weekendDayParts(weekend.start, locale);
  const weekendEnd = weekendDayParts(weekend.end, locale);

  return (
    <section className="pb-6 pt-3" aria-labelledby="home-weekend-title">
      <Container>
        <Link
          href={weekendEventHref()}
          className="group relative block min-h-[13rem] overflow-hidden rounded-lg bg-white no-underline ring-coral transition focus:outline-none focus-visible:ring-2 dark:bg-neutral-950 sm:min-h-[17rem]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/this-weekend.jpg"
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-right-bottom dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/this-weekend-dark.png"
            alt=""
            loading="lazy"
            className="absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10 dark:from-black/80 dark:via-black/45 dark:to-black/5" />
          <div className="absolute left-0 top-12 flex max-w-[12rem] flex-col items-start px-5 sm:inset-y-0 sm:top-auto sm:max-w-xl sm:justify-center sm:p-8">
            <h2 id="home-weekend-title" className="text-[1.4rem] font-extrabold leading-[1.08] text-[#1E0A3C] dark:text-white max-[360px]:text-[1.28rem] sm:text-5xl sm:leading-tight">
              {nav.weekendCardTitle}
            </h2>
            <p className="mt-4 flex items-start gap-3 text-[#1E0A3C] dark:text-white sm:gap-4">
              {[weekendStart, weekendEnd].map((day, index) => (
                <span key={`${day.day}-${day.month}`} className="contents">
                  {index === 1 && (
                    <span className="mt-2 text-2xl font-extrabold leading-none text-muted dark:text-white/55 sm:mt-4 sm:text-3xl">
                      -
                    </span>
                  )}
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-4xl font-extrabold leading-none text-coral sm:text-6xl">{day.day}</span>
                    <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted dark:text-white/70 sm:mt-2 sm:text-sm">
                      {day.month}
                    </span>
                  </span>
                </span>
              ))}
            </p>
          </div>
        </Link>
      </Container>
    </section>
  );
}
