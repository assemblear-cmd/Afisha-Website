# DondeGO Handoff: Current Stage Prompt (2026-07-02)

Project path: `/Users/skif/Documents/GitHub/Afisha-Website`
Branch: `feat/municipal-scraper-i18n` (all work happens here; PRs target `main`)
Local URL: `http://127.0.0.1:3000`
DB: PostgreSQL in Docker (`afisha-postgres`, port **5433**; if it dies with containerd I/O errors, restart Docker Desktop — the volume survives).

## Recommended First Message In A New Chat

```txt
Continue the DondeGO project in /Users/skif/Documents/GitHub/Afisha-Website.

Read docs/HANDOFF-dondego-2026-07-02-next-chat.md first. Start with
git status --short --branch and npm run typecheck. The worktree may be dirty
from parallel sessions — never revert changes you didn't make; verify current
file state before editing shared files.

Then continue with the requested task, preserving: the organizer commerce
module invariants (webhook = payment truth, ledger idempotency keys), the
count-driven category navigation, and the scraping pipeline (bespoke adapters
+ generic JSON-LD fallback).
```

## What The Product Is

DondeGO — Santiago events aggregator + self-service organizer platform, built
on Next.js 14 App Router / React 18 / Tailwind / Prisma 5 / PostgreSQL, local
email+password auth (JWT cookie, `jose`+`bcryptjs`), locales `es` (default)
and `en`.

Two data domains in one Prisma schema:

1. **Aggregator (scraped)**: `Theater` (= any event source: venue, ticketer,
   promoter, museum…) and `Show`. Powers `/`, `/calendario`,
   `/calendario/YYYY-MM-DD`, `/fin-de-semana`, `/teatros`.
2. **Organizer commerce (built 2026-07-01)**: extended `Event`/`TicketType`/
   `Order` + `Ticket`, `TicketScan`, `EventScannerAccess`, `EventModerationLog`,
   `HomepageTile(+Placement)`, `PromoService`, `PromotionOrder(+Item)`,
   `Payment`, `WebhookEvent`, `LedgerTransaction`, `PayoutRequest`, with enums
   for every status machine. Powers `/organizer/*`, `/admin/*`,
   `/account/tickets`, `/checkout/result`, Stripe checkout + webhook, QR
   scanner.

## Commerce Module — Invariants (do not break)

- Roles are lowercase strings on `User.role`: `visitor` (customer),
  `organizer`, `admin`. Registration never accepts `admin`; the admin comes
  from seed (`admin@dondego.test` / `ADMIN_SEED_PASSWORD`, dev fallback
  `password123`).
- Moderation flow (simplified by design): organizer `submit` → `IN_REVIEW`;
  admin `approve` → `PUBLISHED` directly; `reject` (notes required) →
  `REJECTED`; `complete` (PUBLISHED only) → `COMPLETED` (unlocks payouts);
  `archive`. `isPublished` is kept in sync with `status`.
- Payments: order is created `PENDING` (inventory reserved), Stripe Checkout
  session opens; **only the webhook** (`/api/webhooks/stripe`, signature
  verified on raw body, deduped via `WebhookEvent`) marks it `PAID`, issues QR
  tickets, and posts the ledger. Expiry/failure releases inventory. Free
  orders (total 0) skip Stripe and issue tickets immediately.
- Money: integer minor units; CLP = whole pesos (`formatMoney` in
  `src/lib/money.ts`). Ledger = internal token accounting, 1 token = 1 CLP,
  signed amounts, unique `idempotencyKey` (`order:<id>:<TYPE>`,
  `payout:<id>:<TYPE>`) — never credit balances outside
  `src/lib/finance/ledger.ts`. Commission 10% (`src/lib/finance/commission.ts`).
- Payout lifecycle posts HOLD(−X) on request; RELEASE(+X) on reject/cancel;
  RELEASE(+X)+PAID(−X) on admin mark-paid. Available balance exists only for
  `COMPLETED` events.
- Scanner: paid events always scannable; free events need the paid add-on
  (CLP 20,000, activates on webhook). Access = admin | event organizer | staff
  email grant (`EventScannerAccess`, INVITED→ACTIVE on first use, REVOKED cuts
  immediately). Camera uses BarcodeDetector with jsQR fallback + manual token
  input; check-in transition is atomic (`updateMany` guards double scans).
- Homepage paid tiles: 7 slots, hourly CLP pricing with duration discounts
  (12h −10%, 24h −15%, 48h −25%, week −40%) in
  `src/lib/promotion/pricing.ts` (tested). Slot conflicts are prevented inside
  a transaction that locks the tile row (`SELECT … FOR UPDATE`). Active
  placements (`APPROVED`/`LIVE` covering now, event still published) overlay
  the mosaic via the `promoted` prop.

## Scraping Pipeline (current state)

- Registry: `prisma/sourceVenues.ts` — **197 sources** (venues, stadiums,
  clubs, museums, cinemas, ticketers, promoters, aggregators), synced
  non-destructively with `npm run db:sync-theaters`.
- Adapters in `src/lib/scrapers/index.ts`: bespoke `municipal`, `gam`,
  `lascondes`, `teatrouc` + **generic `jsonld` fallback** (schema.org Event
  extraction, 15s fetch timeout) used automatically for every venue without an
  adapter. `runScrape()` scans ALL active sources in parallel batches of 8.
- Manual scan: `npm run db:scrape`. Daily cron: `/api/cron/scrape-theaters`
  (CRON_SECRET; note Vercel `maxDuration: 60` may be too short for 197
  sources — local full scan takes ~140s).
- Last scan results: 214 events upserted; yielding sources: GAM 62,
  Songkick 50, Municipal 46, Cineteca 33, San Ginés 13, Las Condes 7,
  Teatro UC 3. DB now: 224 active shows, 192 upcoming, **177 through
  2026-12-31**, 18 TBA. ~190 sources yield 0 (no JSON-LD; need bespoke
  parsers).

## Category Navigation (2026-07-02)

Everywhere on the site, categories render **only if they have events, ordered
by event count desc** (ties keep taxonomy order):
- homepage top strip: `TopCategoryNav` → `src/lib/data/categoryCounts.ts`
  (counts = active upcoming Shows + PUBLISHED Events), links to
  `/calendario?category=<slug>`;
- filter chips on `/calendario`, `/calendario/[date]`, `/fin-de-semana`
  (window-scoped counts);
- homepage mosaic: no empty-category tiles; slots backfilled with real events.

Two taxonomies — don't conflate: event categories & location categories live
in `src/lib/taxonomy.ts` (aggregator); `src/lib/categories.ts` is the legacy
Eventbrite-style homepage taxonomy.

## Commands

```bash
npm run dev             # dev server
npm run typecheck && npm run lint && npm run test   # all green as of handoff
npm run build           # passes
npm run db:push         # apply schema (project uses db push, no migrations dir)
npm run db:seed         # full destructive reseed
npm run db:sync-theaters   # non-destructive venue registry sync
npm run db:sync-commerce   # non-destructive tiles/promo-services/admin seed
npm run db:scrape       # full scan of all 197 sources
```

Env (`.env`, see `.env.example`): `DATABASE_URL` (localhost:5433),
`AUTH_SECRET`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`APP_URL`, `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`. Stripe webhook locally:
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Demo accounts (password `password123`): `organizer@afisha.test`,
`studio@afisha.test`, `visitor@afisha.test`, `admin@dondego.test`.

## Verification Status (at handoff)

`npm run typecheck` clean; `npm run lint` — one pre-existing `<img>` warning
in `src/app/events/[id]/page.tsx`; `npm run test` — 130/130; `npm run build`
passes (43 pages). Unit tests cover tile pricing/discounts, slot conflicts,
scan decisions, 10% commission, ledger idempotency keys, payout eligibility,
role/scanner permissions, QR token parsing.

## Next Tasks (prioritized)

1. **Bespoke scraper adapters** for high-volume sources that yield 0 via
   JSON-LD: PuntoTicket, Ticketplus, Chile Cultura (chilecultura.gob.cl),
   Movistar Arena, Matucana 100, CorpArtes, Teatro a Mil, Estación Mapocho.
   Follow the `TheaterScraper` interface; dedupe via `[theaterId, externalId]`;
   add fixture-based unit tests (date parsing in America/Santiago, category
   normalization).
2. **Cron capacity**: raise `maxDuration` of `/api/cron/scrape-theaters` or
   split the scan into chunks for Vercel.
3. **Stripe production wiring**: real keys, dashboard webhook endpoint,
   test full paid-ticket + promotion flows end-to-end in browser.
4. **Navigation links**: header has no links to `/organizer`, `/admin`,
   `/account/tickets` (sections reachable by URL only).
5. **Image uploads**: `coverImage` is a URL field; add a storage provider
   (S3/Supabase) behind `src/app/api/uploads/` (stub exists from a parallel
   session — check its current state first).
6. **Stripe Connect** payouts (currently manual admin mark-paid) — architecture
   allows adding onboarding later.
7. **DB-level tile exclusion constraint** (btree_gist) once the project adopts
   `prisma migrate`.
8. **i18n**: new organizer/admin UI is English-first; fold strings into
   `src/i18n/dictionaries/*` when adding locales.
9. **Data quality**: review scraped `Show.categories`/`imageUrl`/`sourceUrl`;
   dark-mode contrast audit of `/calendario`/`/fin-de-semana` headers.
10. **E2E**: Playwright flows for checkout, scanner, moderation, payouts.

## Working Agreements

- Multiple parallel chats edit this branch simultaneously: always re-check
  `git status` / re-read shared files before editing; stage only what the
  current task needs unless a combined commit is requested.
- Don't invent event data; scraped content only from real sources.
- Every org/admin/scan/payout access check is server-side — keep it that way.
