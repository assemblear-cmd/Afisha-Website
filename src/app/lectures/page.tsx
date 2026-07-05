import type { Metadata } from 'next';
import { Container, Card, Badge } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { afishaFetch, AFISHA_API_URL } from '@/lib/content/afisha';

// Lectures / talks come from the Afisha backend (FastAPI + Postgres) read-API,
// not from this site's DB. Contract: docs/CONTRACT.md (GET /api/lectures).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lectures' };

interface Lecture {
  id: number | string;
  title: string;
  speaker: string | null;
  summary: string | null;
  starts_at: string | null;
  venue: string | null;
  city: string | null;
  topic: string | null;
  language: string | null;
  is_online: boolean;
  price: number | null;
  currency: string;
  url: string | null;
  image_url: string | null;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return '';
  if (price === 0) return 'Free';
  return `${new Intl.NumberFormat('en-US').format(price)} ${currency}`;
}

export default async function LecturesPage() {
  const { data, error } = await afishaFetch<Lecture[]>('/api/lectures', []);

  return (
    <main className="min-h-screen bg-surface">
      <div className="border-b border-ink/5 bg-white py-6">
        <Container>
          <h1 className="text-2xl font-bold text-ink">Lectures</h1>
          <p className="mt-1 text-sm text-muted">
            Talks, conferences and workshops — {data.length} upcoming
          </p>
        </Container>
      </div>

      <Container className="py-8">
        {error && (
          <Card className="p-4 text-sm text-muted">
            Couldn&rsquo;t load lectures ({error}). Start the Afisha backend and point{' '}
            <code>AFISHA_API_URL</code> at it (<code>{AFISHA_API_URL}</code>), endpoint{' '}
            <code>GET /api/lectures</code>.
          </Card>
        )}

        {!error && data.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted">No lectures published yet.</Card>
        )}

        {data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((l) => (
              <Card key={l.id} className="flex h-full flex-col overflow-hidden">
                <div className="relative aspect-[16/9] w-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-ink/80 to-coral/60" />
                  {l.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image_url}
                      alt={l.title}
                      className="relative z-10 h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <div className="flex flex-wrap gap-1">
                    {l.topic && <Badge tone="coral">{l.topic}</Badge>}
                    {l.is_online && <Badge tone="success">Online</Badge>}
                  </div>
                  {l.starts_at && (
                    <p className="mt-1 text-sm font-semibold text-coral">
                      {formatDate(l.starts_at)} · {formatTime(l.starts_at)}
                    </p>
                  )}
                  <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-ink">{l.title}</h3>
                  {l.speaker && <p className="text-sm text-muted">{l.speaker}</p>}
                  {(l.venue || l.city) && (
                    <p className="text-sm text-muted">
                      {[l.venue, l.city].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-medium text-ink">
                      {formatPrice(l.price, l.currency)}
                    </span>
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-coral no-underline hover:underline"
                      >
                        Details &rarr;
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
