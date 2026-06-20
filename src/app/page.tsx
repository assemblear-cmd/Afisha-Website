import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Container, LinkButton } from '@/components/ui';
import { SearchBar } from '@/components/events/SearchBar';
import { CategoryCircles } from '@/components/events/CategoryCircles';
import { EventGrid } from '@/components/events/EventGrid';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      startsAt: { gte: new Date() },
    },
    include: { ticketTypes: true },
    orderBy: { startsAt: 'asc' },
    take: 8,
  });

  return (
    <main>
      {/* HERO BANNER */}
      <section className="pt-6">
        <Container>
          <div className="relative h-[360px] overflow-hidden rounded-2xl sm:h-[440px]">
            {/* Free placeholder image; dark overlay keeps the promo legible */}
            <img
              src="https://picsum.photos/seed/afisha-live-stage/1600/700"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />

            <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 sm:px-12">
              <span className="w-fit rounded bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                Find your scene
              </span>
              <h1 className="mt-4 text-3xl font-extrabold uppercase leading-[1.05] text-white sm:text-5xl">
                From{' '}
                <span className="box-decoration-clone bg-coral px-2 text-white">rooftop sets</span>{' '}
                to{' '}
                <span className="box-decoration-clone bg-coral px-2 text-white">sold-out nights</span>
              </h1>
              <Link
                href="/events?category=music"
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink no-underline shadow-lg transition hover:bg-surface"
              >
                Explore live music
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* CONTENT BLOCKS — entry points into the backend-powered vitrina blocks */}
      <section className="pt-10">
        <Container>
          <h2 className="mb-5 text-lg font-semibold text-ink">Browse by block</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/teatros"
              className="group flex flex-col gap-1 rounded-xl border border-ink/10 bg-white p-5 no-underline transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card"
            >
              <span className="text-2xl">🎭</span>
              <span className="mt-1 font-semibold text-ink group-hover:text-coral">Teatros</span>
              <span className="text-sm text-muted">Repertorio en vivo</span>
            </Link>
            <Link
              href="/lectures"
              className="group flex flex-col gap-1 rounded-xl border border-ink/10 bg-white p-5 no-underline transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card"
            >
              <span className="text-2xl">🎓</span>
              <span className="mt-1 font-semibold text-ink group-hover:text-coral">Lectures</span>
              <span className="text-sm text-muted">Talks &amp; conferences</span>
            </Link>
            {[
              { emoji: '🍴', label: 'Food' },
              { emoji: '🎬', label: 'Films' },
            ].map((b) => (
              <div
                key={b.label}
                className="flex flex-col gap-1 rounded-xl border border-dashed border-ink/10 bg-surface p-5 opacity-70"
              >
                <span className="text-2xl grayscale">{b.emoji}</span>
                <span className="mt-1 font-semibold text-ink">{b.label}</span>
                <span className="text-sm text-muted">Próximamente</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* MOBILE SEARCH — the header search is desktop-only */}
      <section className="mt-6 lg:hidden">
        <Container>
          <SearchBar />
        </Container>
      </section>

      {/* CATEGORY CIRCLES */}
      <section className="py-10">
        <Container>
          <h2 className="mb-5 text-lg font-semibold text-ink">Browse by category</h2>
          <CategoryCircles />
        </Container>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="py-12 bg-surface">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink">Upcoming events</h2>
            <LinkButton href="/events" variant="ghost" size="sm">
              See all →
            </LinkButton>
          </div>
          <EventGrid events={events} />
        </Container>
      </section>
    </main>
  );
}
