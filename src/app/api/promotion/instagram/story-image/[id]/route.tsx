import { ImageResponse } from 'next/og';
import { loadStoryEventById } from '@/lib/promotion/instagram-story';
import { storyLabels } from '@/lib/promotion/story-content';

// Public 1080×1920 Story image for a native event, rendered with next/og
// (Satori). Public on purpose: the Instagram Graph API fetches image_url
// server-side, and it only ever exposes already-public event marketing data.
// Only PUBLISHED events render; anything else 404s.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INK = '#1E0A3C';
const CORAL = '#E21B2D';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const event = await loadStoryEventById(params.id);
  if (!event) {
    return new Response('Not found', { status: 404 });
  }
  const labels = storyLabels(event);

  const metaRow = (label: string, value: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 30, letterSpacing: 4, color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      <div style={{ fontSize: 52, color: '#ffffff' }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1920px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '96px 84px 104px',
          color: '#ffffff',
          backgroundColor: INK,
          backgroundImage: `linear-gradient(157deg, #2a1150 0%, ${INK} 46%, #12062a 100%)`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800 }}>
            <span>Donde</span>
            <span style={{ color: CORAL }}>GO</span>
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.65)', marginTop: 8 }}>
            Cartelera de Santiago
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              backgroundColor: CORAL,
              color: '#ffffff',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 6,
              padding: '16px 34px',
              borderRadius: 14,
            }}
          >
            {labels.badge}
          </div>
          <div style={{ fontSize: 116, fontWeight: 800, lineHeight: 1.05, marginTop: 40 }}>
            {event.title}
          </div>
          {labels.venue ? (
            <div style={{ fontSize: 44, color: 'rgba(255,255,255,0.82)', marginTop: 24 }}>
              {labels.venue}
            </div>
          ) : null}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          {metaRow('FECHA', labels.dateLabel)}
          {metaRow('HORA', labels.timeLabel)}
          {labels.address ? metaRow('LUGAR', labels.address) : null}
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 8,
              border: '3px solid rgba(255,255,255,0.4)',
              borderRadius: 999,
              padding: '22px 44px',
              fontSize: 44,
              color: '#ff8f99',
            }}
          >
            {labels.priceLabel}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: CORAL,
            borderRadius: 26,
            padding: '42px 50px',
          }}
        >
          <div style={{ fontSize: 46, fontWeight: 700 }}>Compra tu entrada →</div>
          <div style={{ fontSize: 46, fontWeight: 800 }}>dondego.cl</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
