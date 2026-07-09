#!/usr/bin/env node
// DondeGO Instagram Story generator — the "hands" half of the local
// story-posting agent (.claude/skills/instagram-story drives the posting).
//
//   node scripts/instagram-story/generate-story.mjs               # render next story
//   node scripts/instagram-story/generate-story.mjs --mark-posted <eventId>
//
// Picks the nearest upcoming Santiago event from the live API that has not
// been posted yet (state in .state/posted.json), renders a 1080×1920 PNG in
// DondeGO branding (with the event cover when reachable), and prints a JSON
// result to stdout for the posting agent to consume. Generation never mutates
// state — the agent calls --mark-posted only after the story is actually up.
//
// Env:
//   DONDEGO_API_BASE     API origin (default https://dondego.cl)
//   STORY_LOOKAHEAD_DAYS prefer events starting within N days (default 14)
//   STORY_CHROME_PATH    explicit Chrome/Chromium binary; otherwise the
//                        system Chrome (channel "chrome"), then Playwright's
//                        bundled Chromium.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, 'out');
const STATE_FILE = path.join(HERE, '.state', 'posted.json');
const API_BASE = (process.env.DONDEGO_API_BASE ?? 'https://dondego.cl').replace(/\/+$/, '');
const LOOKAHEAD_DAYS = Number(process.env.STORY_LOOKAHEAD_DAYS ?? 14) || 14;
const TZ = 'America/Santiago';

// ---- state -----------------------------------------------------------------

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_FILE, 'utf8'));
    return { posted: Array.isArray(parsed.posted) ? parsed.posted : [] };
  } catch {
    return { posted: [] };
  }
}

async function saveState(state) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// ---- event selection ---------------------------------------------------------

function isSantiago(ev) {
  return /santiago/i.test(`${ev.city ?? ''} ${ev.address ?? ''}`);
}

function cheapestClp(ev) {
  const prices = (ev.ticketTypes ?? [])
    .filter((t) => t.status === 'ACTIVE' || t.status === 'SOLD_OUT')
    .map((t) => t.priceCents)
    .filter((p) => Number.isFinite(p) && p > 0);
  // priceCents stores CLP * 100 (CLP has no minor unit in practice).
  return prices.length ? Math.round(Math.min(...prices) / 100) : null;
}

const CATEGORY_LABELS = {
  music: 'MÚSICA',
  'performing-visual-arts': 'ESCENA',
  nightlife: 'FIESTA',
  business: 'NEGOCIOS',
  'food-drink': 'GASTRONOMÍA',
  hobbies: 'PANORAMA',
  lectures: 'CHARLA',
  holidays: 'FESTIVAL',
  concierto: 'CONCIERTO',
  'obra-de-teatro': 'TEATRO',
  festival: 'FESTIVAL',
  comedia: 'COMEDIA',
  exposicion: 'EXPOSICIÓN',
  charla: 'CHARLA',
  gastronomia: 'GASTRONOMÍA',
  deportes: 'DEPORTES',
  cine: 'CINE',
};

function categoryBadge(ev) {
  const text = `${ev.title} ${ev.description ?? ''}`;
  if (/[óo]pera/i.test(text)) return 'ÓPERA';
  if (/sinf[óo]nic|orquesta|filarm[óo]nic/i.test(text)) return 'CONCIERTO';
  return CATEGORY_LABELS[ev.category] ?? (ev.category ? ev.category.toUpperCase() : 'EVENTO');
}

export function pickEvent(events, postedIds, now = new Date()) {
  const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 864e5);
  const upcoming = events
    .filter((ev) => ev.isPublished !== false && isSantiago(ev))
    .filter((ev) => {
      const starts = new Date(ev.startsAt);
      return !isNaN(starts.getTime()) && starts > now;
    })
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  if (upcoming.length === 0) return null;

  const fresh = upcoming.filter((ev) => !postedIds.includes(ev.id));
  const near = fresh.filter((ev) => new Date(ev.startsAt) <= horizon);
  // Preference order: unposted within the lookahead window → any unposted →
  // (everything already posted) the nearest one again.
  return near[0] ?? fresh[0] ?? upcoming[0];
}

// ---- rendering ---------------------------------------------------------------

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function fetchCoverDataUri(url) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000 || buf.length > 8_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null; // unreachable cover never blocks the story — gradient fallback
  }
}

function storyHtml(ev, labels, coverDataUri) {
  const coverLayer = coverDataUri
    ? `url("${coverDataUri}") center / cover no-repeat`
    : 'none';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px; overflow: hidden; position: relative;
    font-family: Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #fff;
    background:
      radial-gradient(1200px 900px at 85% -5%, rgba(226,27,45,.55), transparent 62%),
      radial-gradient(1000px 800px at -10% 108%, rgba(226,27,45,.38), transparent 60%),
      linear-gradient(160deg, #2a1150 0%, #1E0A3C 45%, #12062a 100%);
    display: flex; flex-direction: column;
    padding: 96px 88px 110px;
  }
  .cover { position: absolute; inset: 0; background: ${coverLayer}; }
  .cover-shade {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(18,6,42,.62) 0%, rgba(18,6,42,.55) 40%, rgba(18,6,42,.94) 78%);
  }
  .content { position: relative; display: flex; flex-direction: column; flex: 1; }
  .brand { font-size: 64px; font-weight: 800; letter-spacing: -1px; }
  .brand .go { color: #E21B2D; }
  .brand-sub { margin-top: 10px; font-size: 30px; color: rgba(255,255,255,.7); font-weight: 600; }
  .badge {
    margin-top: 120px; display: inline-block; align-self: flex-start;
    background: #E21B2D; color: #fff; font-weight: 800; font-size: 34px;
    letter-spacing: 6px; padding: 18px 36px; border-radius: 14px;
  }
  h1 { margin-top: 44px; font-size: 128px; line-height: 1.04; font-weight: 900; letter-spacing: -3px; text-wrap: balance; }
  .subtitle { margin-top: 26px; font-size: 44px; font-weight: 600; color: rgba(255,255,255,.85); }
  .meta { margin-top: 88px; display: flex; flex-direction: column; gap: 34px; }
  .row { display: flex; align-items: baseline; gap: 26px; font-size: 46px; font-weight: 600; }
  .row .ico { width: 64px; text-align: center; }
  .row .big { font-size: 56px; font-weight: 800; }
  .row .dim { color: rgba(255,255,255,.68); font-size: 38px; }
  .price {
    margin-top: 84px; align-self: flex-start;
    border: 3px solid rgba(255,255,255,.4); border-radius: 999px;
    padding: 26px 48px; font-size: 44px; font-weight: 700;
    background: rgba(18,6,42,.35);
  }
  .price b { color: #ff5b6a; }
  .cta {
    margin-top: auto; background: #E21B2D; border-radius: 26px;
    padding: 44px 52px; display: flex; align-items: center; justify-content: space-between;
  }
  .cta .t { font-size: 46px; font-weight: 800; }
  .cta .u { font-size: 46px; font-weight: 900; letter-spacing: 1px; }
</style></head><body>
  <div class="cover"></div>
  <div class="cover-shade"></div>
  <div class="content">
    <div>
      <div class="brand">Donde<span class="go">GO</span></div>
      <div class="brand-sub">Cartelera de Santiago</div>
    </div>
    <div class="badge">${esc(labels.badge)}</div>
    <h1>${esc(ev.title)}</h1>
    ${ev.venue ? `<div class="subtitle">${esc(ev.venue)}</div>` : ''}
    <div class="meta">
      <div class="row"><span class="ico">🗓</span><span class="big">${esc(labels.date)}</span></div>
      <div class="row"><span class="ico">🕗</span><span class="big">${esc(labels.time)} hrs</span></div>
      ${ev.address ? `<div class="row"><span class="ico">📍</span><span>${esc(ev.address)}</span></div>` : ''}
    </div>
    <div class="price">${labels.price}</div>
    <div class="cta"><span class="t">Compra tu entrada&nbsp;→</span><span class="u">dondego.cl</span></div>
  </div>
</body></html>`;
}

async function launchBrowser() {
  const executablePath = process.env.STORY_CHROME_PATH;
  if (executablePath) return chromium.launch({ executablePath });
  try {
    return await chromium.launch({ channel: 'chrome' }); // system Chrome, no download
  } catch {
    return chromium.launch(); // Playwright's own Chromium as a last resort
  }
}

async function render(ev) {
  const startsAt = new Date(ev.startsAt);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const date = cap(
    new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(startsAt)
  );
  const time = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(startsAt);
  const clp = cheapestClp(ev);
  const price =
    ev.isFree || clp === 0
      ? 'Entrada <b>gratis</b>'
      : clp != null
        ? `Entradas desde <b>$${new Intl.NumberFormat('es-CL').format(clp)} CLP</b>`
        : 'Entradas en <b>dondego.cl</b>';

  const coverDataUri = await fetchCoverDataUri(ev.coverImage);
  const html = storyHtml(ev, { badge: categoryBadge(ev), date, time, price }, coverDataUri);

  await mkdir(OUT_DIR, { recursive: true });
  const imagePath = path.join(OUT_DIR, `story-${ev.id}.png`);
  const browser = await launchBrowser();
  try {
    const page = await (
      await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
    ).newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: imagePath });
  } finally {
    await browser.close();
  }

  return { imagePath, dateLabel: date, timeLabel: time, usedCover: !!coverDataUri };
}

// ---- main ---------------------------------------------------------------------

async function main() {
  const markIdx = process.argv.indexOf('--mark-posted');
  if (markIdx !== -1) {
    const id = process.argv[markIdx + 1];
    if (!id) throw new Error('--mark-posted requires an event id');
    const state = await loadState();
    if (!state.posted.includes(id)) state.posted.push(id);
    await saveState(state);
    console.log(JSON.stringify({ ok: true, marked: id, totalPosted: state.posted.length }));
    return;
  }

  const res = await fetch(`${API_BASE}/api/events`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${API_BASE}/api/events`);
  const events = (await res.json()).events ?? [];

  const state = await loadState();
  const ev = pickEvent(events, state.posted);
  if (!ev) {
    console.log(JSON.stringify({ ok: false, reason: 'no-upcoming-santiago-events' }));
    process.exitCode = 2;
    return;
  }

  const rendered = await render(ev);
  console.log(
    JSON.stringify(
      {
        ok: true,
        imagePath: rendered.imagePath,
        usedCover: rendered.usedCover,
        alreadyPosted: state.posted.includes(ev.id),
        event: {
          id: ev.id,
          title: ev.title,
          startsAt: ev.startsAt,
          venue: ev.venue,
          dateLabel: rendered.dateLabel,
          timeLabel: rendered.timeLabel,
        },
        storyLink: `${API_BASE}/events/${ev.id}`,
        markPostedCommand: `node scripts/instagram-story/generate-story.mjs --mark-posted ${ev.id}`,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
