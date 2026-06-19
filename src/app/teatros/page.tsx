import type { Metadata } from 'next';
import { Container, Card, Badge } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { afishaFetch, AFISHA_API_URL } from '@/lib/content/afisha';

// Репертуар театров живёт в бэкенде Afisha (Python/FastAPI, своя БД Postgres),
// а не в Prisma этого сайта. Страница тянет витрину из его read-API.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Afisha de teatros' };

interface RepEvent {
  id: number;
  title: string;
  starts_at: string | null;
  venue: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  url: string | null;
  image_url: string | null;
}

interface RepItem {
  theater: { id: number; name: string; slug: string; website: string | null; city: string };
  events: RepEvent[];
}

function formatClp(price: number | null, currency: string): string | null {
  if (price == null) return null;
  return `${new Intl.NumberFormat('es-CL').format(price)} ${currency}`;
}

export default async function TeatrosPage() {
  const { data, error } = await afishaFetch<RepItem[]>('/api/repertoire', []);
  const totalEvents = data.reduce((n, i) => n + i.events.length, 0);

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-white border-b border-ink/5 py-6">
        <Container>
          <h1 className="text-2xl font-bold text-ink">Afisha de teatros</h1>
          <p className="text-muted text-sm mt-1">
            Repertorio de teatros de Santiago — {data.length} teatros · {totalEvents} funciones
          </p>
        </Container>
      </div>

      <Container className="py-8 flex flex-col gap-10">
        {error && (
          <Card className="p-4 text-sm text-muted">
            No se pudo cargar el repertorio ({error}). Inicia el backend:{' '}
            <code>uvicorn afisha.api:app</code> en <code>{AFISHA_API_URL}</code>.
          </Card>
        )}

        {data.map((item) => (
          <section key={item.theater.id}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">{item.theater.name}</h2>
              {item.theater.website && (
                <a
                  href={item.theater.website}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm text-coral no-underline hover:underline"
                >
                  Sitio oficial →
                </a>
              )}
            </div>

            {item.events.length === 0 ? (
              <p className="text-sm text-muted">Repertorio próximamente.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {item.events.map((e) => (
                  <Card key={e.id} className="flex h-full flex-col overflow-hidden">
                    <div className="relative aspect-[16/9] w-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-ink/80 to-coral/60" />
                      {e.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.image_url}
                          alt={e.title}
                          className="relative z-10 h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      {e.category && <Badge tone="coral">{e.category}</Badge>}
                      {e.starts_at && (
                        <p className="mt-1 text-sm font-semibold text-coral">
                          {formatDate(e.starts_at)} · {formatTime(e.starts_at)}
                        </p>
                      )}
                      <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-ink">
                        {e.title}
                      </h3>
                      {e.venue && <p className="text-sm text-muted">{e.venue}</p>}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="text-sm font-medium text-ink">
                          {formatClp(e.price, e.currency) ?? ''}
                        </span>
                        {e.url && (
                          <a
                            href={e.url}
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
          </section>
        ))}
      </Container>
    </main>
  );
}
