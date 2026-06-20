import type { Metadata } from 'next';
import { Container, Card, CoverPlaceholder } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { categoryEmoji } from '@/lib/categories';
import { getUpcomingShows } from '@/lib/data/shows';

// Cartelera estilo Eventbrite: funciones de teatro en Santiago, leídas del
// agregador (tabla Show) que el escáner diario actualiza desde los sitios de
// cada teatro. Server Component → consulta Prisma directamente.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Teatro en Santiago — Afisha' };

function formatClp(priceCents: number | null, currency: string): string {
  if (priceCents == null) return '';
  if (priceCents === 0) return 'Gratis';
  return `${new Intl.NumberFormat('es-CL').format(Math.round(priceCents / 100))} ${currency}`;
}

export default async function TeatrosPage() {
  const shows = await getUpcomingShows();

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-white border-b border-ink/5 py-6">
        <Container>
          <h1 className="text-2xl font-bold text-ink">Teatro en Santiago</h1>
          <p className="text-muted text-sm mt-1">
            Cartelera de teatros de Santiago — {shows.length} funciones
          </p>
        </Container>
      </div>

      <Container className="py-8">
        {shows.length === 0 ? (
          <Card className="p-4 text-sm text-muted">
            Aún no hay funciones. El escáner diario las irá poblando desde los sitios de cada teatro.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((s) => (
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
                  <p className="text-sm text-muted">
                    {s.theater.name}
                    {s.venue ? ` · ${s.venue}` : ''}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-medium text-ink">
                      {formatClp(s.priceCents, s.currency)}
                    </span>
                    {s.sourceUrl && (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-coral no-underline hover:underline"
                      >
                        Entradas →
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
