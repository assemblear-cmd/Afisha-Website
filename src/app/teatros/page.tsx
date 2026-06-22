import type { Metadata } from 'next';
import { Container, Card, CoverPlaceholder } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { categoryEmoji } from '@/lib/categories';
import { getTheatersWithShows } from '@/lib/data/shows';
import { getLocale } from '@/i18n/getLocale';
import { getDictionary } from '@/i18n/config';

// Theater-first cartelera: lists every theater in the DB, each with its own
// afisha (upcoming shows scraped into the Show table), or a "coming soon"
// placeholder. Server Component → queries Prisma directly.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(getLocale()).teatros.metaTitle };
}

function formatClp(priceCents: number | null, currency: string, freeLabel: string): string {
  if (priceCents == null) return '';
  if (priceCents === 0) return freeLabel;
  return `${new Intl.NumberFormat('es-CL').format(Math.round(priceCents / 100))} ${currency}`;
}

export default async function TeatrosPage() {
  const t = getDictionary(getLocale()).teatros;
  const theaters = await getTheatersWithShows();
  const totalShows = theaters.reduce((n, th) => n + th.shows.length, 0);

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-white border-b border-ink/5 py-6">
        <Container>
          <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
          <p className="text-muted text-sm mt-1">
            {t.subtitlePrefix} — {theaters.length} {t.theatersCount} · {totalShows} {t.functions}
          </p>
        </Container>
      </div>

      <Container className="py-8 flex flex-col gap-10">
        {theaters.map((theater) => (
          <section key={theater.id}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">{theater.name}</h2>
              {theater.website && (
                <a
                  href={theater.website}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm text-coral no-underline hover:underline"
                >
                  {t.officialSite} →
                </a>
              )}
            </div>

            {theater.shows.length === 0 ? (
              <p className="text-sm text-muted">{t.theaterEmpty}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {theater.shows.map((s) => (
                  <Card key={s.id} className="flex h-full flex-col overflow-hidden">
                    <div className="relative aspect-[16/9] w-full">
                      <CoverPlaceholder
                        seed={s.id}
                        glyph={categoryEmoji(s.category ?? 'performing-visual-arts')}
                      />
                      {s.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          className="relative z-10 h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      {s.startsAt && (
                        <p className="mt-1 text-sm font-semibold text-coral">
                          {formatDate(s.startsAt.toISOString())} · {formatTime(s.startsAt.toISOString())}
                        </p>
                      )}
                      <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-ink">{s.title}</h3>
                      {s.venue && <p className="text-sm text-muted">{s.venue}</p>}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="text-sm font-medium text-ink">
                          {formatClp(s.priceCents, s.currency, t.free)}
                        </span>
                        {s.sourceUrl && (
                          <a
                            href={s.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-coral no-underline hover:underline"
                          >
                            {t.tickets} →
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))}
      </Container>
    </main>
  );
}
