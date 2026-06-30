import Link from 'next/link';
import { Container } from '@/components/ui';
import { getLocale } from '@/i18n/getLocale';
import { getHomeNav } from '@/i18n/homeNav';
import { weekendEventHref } from '@/lib/weekend';

export function WeekendFeature() {
  const locale = getLocale();
  const nav = getHomeNav(locale);

  return (
    <section className="pb-6 pt-3" aria-labelledby="home-weekend-title">
      <Container>
        <Link
          href={weekendEventHref()}
          className="group relative block min-h-[13rem] overflow-hidden rounded-lg bg-white no-underline ring-coral transition focus:outline-none focus-visible:ring-2 sm:min-h-[17rem]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/this-weekend.png"
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-right-bottom"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10" />
          <div className="absolute inset-y-0 left-0 flex max-w-xl items-center p-5 sm:p-8">
            <h2 id="home-weekend-title" className="text-3xl font-extrabold leading-tight text-[#1E0A3C] sm:text-5xl">
              {nav.weekendCardTitle}
            </h2>
          </div>
        </Link>
      </Container>
    </section>
  );
}
