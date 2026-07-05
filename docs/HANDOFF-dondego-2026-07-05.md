# DondeGO — Handoff (2026-07-05, branch `main`)

Self-contained context for continuing work on this branch in a fresh chat.
Everything lives on a **single branch: `main`** (feature branches were merged
and deleted earlier). Repo: `/Users/skif/Documents/GitHub/Afisha-Website`.

---

## 1. Product

**DondeGO** — an events aggregator for Santiago, Chile, plus a self-service
ticketing platform. Two sides in one product:

1. **Aggregator / vitrina** — scrapes events from external sources (theaters,
   venues, ticketers, museums). Tickets for these are bought **on the source
   site** (external link).
2. **Ticketing platform** — a user publishes their own event, sells tickets
   through DondeGO (Stripe), and staff scan QR codes at the door.

Locales: `es` (primary) + `en`. Currency: **CLP** (integer pesos).

## 2. Business logic / monetization

- **10% commission** per DondeGO ticket sale; 90% to the organizer
  (`PLATFORM_COMMISSION_PCT` in `src/lib/finance/commission.ts`).
- Money flows through **Stripe**; organizer balances via an internal **ledger**
  (CLP tokens). **Invariant: the Stripe webhook is the only source of payment
  truth** — the client never marks an order paid.
- Extra revenue: homepage promo tiles (hourly CLP pricing with duration
  discounts, `src/lib/promotion/pricing.ts`), promo services, and a paid
  scanner add-on for free events.

## 3. Architecture

- **Web + API**: Next.js 14 App Router, React 18, TypeScript, Tailwind,
  Prisma 5, PostgreSQL. Server Components read Prisma directly; auth is
  email+password JWT (`jose` + `bcryptjs`) in a cookie for web, Bearer for
  mobile. Google sign-in (mobile) verifies the Google ID token against Google's
  JWKS in `src/app/api/v1/auth/google/route.ts` (needs `GOOGLE_CLIENT_ID`).
- **Android app**: native Kotlin/Jetpack Compose in `apps/android` (multi-module
  core/* + feature/*), Retrofit, Credential Manager for Google sign-in, in-app
  language menu, ZXing QR. Talks to `/api/v1/*` (Bearer JWT).
- **Two data domains, one schema** (`prisma/schema.prisma`):
  - aggregator: `Theater` (source) + `Show` (scraped event);
  - commerce: `Event` / `TicketType` / `Order` / `Ticket` / `TicketScan` /
    `Payment` / `LedgerTransaction` / `PayoutRequest` / promo models.
- **Scraper**: ~197 source registry in `prisma/sourceVenues.ts` (adapters +
  JSON-LD fallback); ~200 live events in the DB.

## 4. Key surfaces (web routes)

| Route | Purpose |
|---|---|
| `/` | Homepage: hero, category circles, weekend card, upcoming |
| `/fin-de-semana` | "This weekend" listing (Sat–Sun), category filter |
| `/calendario`, `/calendario/[date]` | Calendar view |
| `/events`, `/events/[id]` | Search + public event page |
| `/organizer/*` | **Canonical** event console: dashboard, events, per-event dashboard (tickets/promotion/scanner access/finance), scanner, payouts |
| `/admin/*` | Moderation + finance (admin only) |
| `/login`, `/register` | Auth (register no longer asks visitor vs organizer) |
| `/dashboard/*` | **Legacy**, now redirects into `/organizer/*` |

## 5. Roles / authorization (updated this session)

- **Every logged-in user can create and manage their own events** — there is no
  separate "organizer" account. `requireOrganizer()` in `src/lib/authz.ts` now
  just requires a logged-in user; **per-event access is still enforced by
  `requireEventOwnership`** (a user only touches events they own; admins bypass).
- `role` values (lowercase): `visitor` | `organizer` | `admin`. New signups
  default to `visitor`; the distinction no longer gates event creation. `admin`
  is seed-only.
- Header shows **"Create event"** (`/organizer/events/new`) and **"My events"**
  (`/organizer/events`) to all logged-in users; clicking a My-events item opens
  that event's organizer dashboard (`/organizer/events/[id]`).

## 6. i18n, theme, taxonomy

- i18n: `src/i18n/*` — `getLocale()`, `getDictionary()`, `getHomeNav()`,
  dictionaries in `src/i18n/dictionaries/{es,en}.json`.
- Theme: `darkMode: 'class'`; semantic tokens are CSS variables in
  `src/app/globals.css` (`--color-ink/body/muted/surface/card/canvas`) exposed
  as Tailwind `text-ink`, `bg-card`, etc. **Gotcha: never use literal
  `bg-white`/`text-black` on themed surfaces — it breaks dark mode contrast**
  (that was the `/fin-de-semana` bug fixed here; use `bg-card`).
- **Two category systems (don't conflate)**: homepage nav taxonomy
  (`src/i18n/homeNav.ts`) vs aggregator event/location taxonomy
  (`src/lib/taxonomy.ts`, `EVENT_CATEGORIES`). Category nav is count-driven
  (only non-empty categories, by descending count).
- Weekend window: `src/lib/weekend.ts` `weekendWindow()` returns **Saturday–
  Sunday** (`getWeekendShows` derives its range from it). Unit test in
  `tests/unit/weekend.test.ts`.

## 7. What changed most recently on this branch

- **Mobile Android app + `/api/v1` mobile API** committed; language menu,
  "Log in" button, Google sign-in (see `docs/DondeGO-summary-2026-07-05.md` for
  the Android/Play-Market detail).
- **Web (this session)**: weekend = Sat–Sun; `/fin-de-semana` dark-mode contrast
  fix; mobile menu tile icons normalized to a uniform size; city banner uses a
  location-pin + smaller font (no "City" label); event creation opened to all
  logged-in users with `/dashboard/*` → `/organizer/*` redirects.

## 8. Run & verify

```bash
npm run dev            # web + API on :3000 (phone: -- -H 0.0.0.0)
npm run typecheck && npm run lint && npm run test   # tsc, next lint, 144 vitest tests
cd apps/android && ./gradlew :app:assembleDebug     # -PdondegoApiBase=<url> -PdondegoGoogleClientId=<id>
```

Env: see `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, Stripe keys,
`GOOGLE_CLIENT_ID`, `APP_URL`, `CRON_SECRET`).

## 9. Gotchas

- **Docker Postgres** runs on `:5433` (`afisha-postgres`); it occasionally dies
  with containerd input/output errors — a full Docker Desktop restart fixes it
  and the volume survives. Use `npm run db:sync-*` for non-destructive updates.
- A local **GateGuard hook** requires restating file/impact facts before the
  first edit to each file and before the first Bash call — expected, not an
  error. Disable per-session via `ECC_GATEGUARD=off` if needed.
- `next lint` shows one pre-existing `<img>` warning in `events/[id]/page.tsx`
  (unrelated).
