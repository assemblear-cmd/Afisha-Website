# DondeGO Android App — Architecture & Implementation Plan

Status: **Phase 1–2 + scanner implemented; app builds** (updated 2026-07-05,
branch `feat/municipal-scraper-i18n`).
Companion document: [`docs/android-api.md`](./android-api.md) — the mobile API
contract this plan depends on.

> **Implementation note (2026-07-05).** The native app exists under
> `apps/android` and `./gradlew :app:assembleDebug` succeeds (lint: 0 errors).
> Delivered: visitor discovery, event detail (native + scraped with external
> source links), auth with encrypted session storage, My Tickets + QR display,
> and a server-authorized scanner (event picker + manual token entry against
> `POST /api/scan`). Organizer/admin are role-gated with a web-console Custom
> Tab handoff. **Deferred:** native Stripe PaymentSheet (native events hand off
> to web checkout in a Custom Tab, preserving webhook-as-payment-truth) and
> CameraX/ML Kit camera scanning (manual token entry today). See the roadmap in
> §7 and the API status block in `docs/android-api.md`.

---

## 1. Product summary

DondeGO is a Santiago events aggregator + self-service organizer platform. The
web app (Next.js 14 App Router, React 18, Tailwind, Prisma 5, PostgreSQL) serves
two data domains from one schema:

1. **Aggregator (scraped)** — `Theater` (197 registered sources) + `Show`
   (scraped repertoire; real sources only, bespoke adapters + generic JSON-LD
   fallback). Powers `/`, `/calendario`, `/fin-de-semana`, `/teatros`.
2. **Organizer commerce** — `Event`/`TicketType`/`Order`/`Ticket` +
   scanner, moderation, homepage promotion tiles, Stripe payments,
   CLP token ledger, manual payouts. Powers `/organizer/*`, `/admin/*`,
   `/account/tickets`, checkout, QR scanner.

The Android app must eventually cover: visitor discovery, event details,
DondeGO-native ticket purchase, external source/ticket links for scraped
events, account + "My Tickets", QR ticket display, organizer dashboard,
QR scanner, admin/moderation where practical, and a Google Play-ready release.

---

## 2. Stack decision

### Options evaluated

| Option | Verdict | Reasoning |
|---|---|---|
| **Native Kotlin + Jetpack Compose** | ✅ **Chosen** | First-class Stripe PaymentSheet SDK, CameraX + ML Kit barcode scanning, Android Keystore-backed secure storage, Material 3, best long-term production posture. |
| React Native | ❌ | The repo has **zero reusable JS UI or API-client code** for mobile — the web app is server-rendered React Server Components reading Prisma directly; there is no shared fetch layer or component library to amortize. RN would add a bridge tax on the two most native-critical flows (payments, camera scanning) with nothing reused in return. |
| Expo | ❌ | Same reuse argument as RN; additionally the camera/QR + Stripe combination pushes quickly into dev-client/eject territory, negating Expo's main advantage. |
| Capacitor / WebView | ❌ | The web UI is a server-rendered desktop-first site, not a mobile SPA; wrapping it gives poor UX, weak offline behavior, no native PaymentSheet, and Play policy risk for a payments+camera app. |

### Decision

**Native Kotlin + Jetpack Compose.** The deciding factors, in order:

1. **Stripe**: PaymentSheet is the reference-quality mobile payment UI and is a
   native Android SDK. Payment is a core flow (invariant: app initiates
   payment, webhook remains payment truth).
2. **Camera/QR**: both the ticket QR display and the staff scanner are core
   flows; CameraX + ML Kit is the most robust path.
3. **Nothing to share**: the web codebase offers no portable JS layer, so
   cross-platform frameworks buy nothing here.
4. **Security**: JWT storage in EncryptedSharedPreferences/Keystore, server-side
   permission checks mirrored by a thin typed client.
5. **Play readiness**: full control of target SDK, signing, R8, data-safety
   declarations.

---

## 3. Product identity

| Item | Value |
|---|---|
| App name / Play listing name | `DondeGO` |
| Android `applicationId` | `dondeg.app` |
| Android `namespace` | `dondeg.app` |

**Validity check for `dondeg.app`**: Android's application ID rules require at
least two segments, each segment starting with a letter, and only
alphanumeric/underscore characters. `dondeg` and `app` both satisfy this, so
**`dondeg.app` is a fully valid applicationId and namespace**. No alternative
is needed. Source checked 2026-07-03:
<https://developer.android.com/build/configure-app-module>.

One non-blocking note: reverse-DNS convention for the domain `dondeg.app`
would be `app.dondeg`. This is purely conventional; it has no technical or
Play-policy effect. We keep the requested `dondeg.app`.

---

## 4. Repository audit

### 4.1 Backend/API audit

The full inventory of all **29 existing API route files** with per-route mobile
verdicts is in
[`docs/android-api.md`](./android-api.md) §2. Summary of findings:

**What exists and can be reused or wrapped for mobile:**

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` —
  JWT (HS256 via `jose`, 7-day expiry) but delivered **only as an httpOnly
  cookie** (`afisha_token`); the token is never returned in the body.
- `GET /api/events`, `GET /api/events/[id]` — published **organizer-module**
  events only (with ticket types). No pagination.
- `POST /api/checkout` — creates a PENDING order + `Payment`, opens a Stripe
  **Checkout Session** (web redirect URL). Free orders issue tickets
  immediately. Prices always re-derived from DB.
- `POST /api/scan` — full server-side scan pipeline (`performScan`): access
  check → token parse → atomic `ISSUED→CHECKED_IN` transition (`updateMany`
  guard) → `TicketScan` history row. **Usable by Android as-is.**
- Organizer mutations: create/edit/submit events, ticket types CRUD, scanner
  grants, payout request/cancel — all JSON, all server-side authorized
  (`requireOrganizer` + `requireEventOwnership`).
- Admin mutations: moderate (`approve|reject|archive|complete`), payout
  actions (`start_review|approve|reject|mark_paid`), ticket
  invalidate/cancel, promo item actions, tile pricing.
- `POST /api/webhooks/stripe` — signature-verified on raw body, deduped via
  `WebhookEvent`; **the only place an order becomes PAID**, tickets are
  issued, and the ledger is posted.
- `POST /api/uploads/event-cover` — multipart upload (5 MB, jpg/png/webp/gif)
  to local `public/uploads/events/` (storage provider still a TODO).

**Critical gaps for Android (all read paths):**

1. **No API at all for the aggregator domain.** `/`, `/calendario`,
   `/fin-de-semana`, `/teatros` are React Server Components calling
   `src/lib/data/shows.ts` and `src/lib/data/categoryCounts.ts` directly via
   Prisma. Android needs new JSON endpoints for: home feed, unified event
   list (scraped `Show` + native `Event`), event detail for both kinds,
   count-driven categories, calendar/date counts, weekend window, venues.
2. **No account/ticket read API.** `/account/tickets` and the QR page read
   Prisma in server components. Android needs "my tickets", ticket detail
   (with QR payload `DGO1.<token>`), and order status.
3. **Cookie-only auth.** `getCurrentUser()` reads `cookies()` only. Mobile
   needs `Authorization: Bearer <jwt>` support and the token returned in the
   login/register response body. This is a **single small change** in
   `src/lib/auth.ts` that unlocks *every* existing protected route for mobile.
4. **No PaymentIntent endpoint.** The Stripe integration is Checkout-Session
   (hosted redirect). PaymentSheet needs: create-PaymentIntent endpoint and
   webhook handling for `payment_intent.succeeded` / `payment_intent.
   payment_failed` / `payment_intent.canceled` (today only
   `checkout.session.*` and `charge.refunded` are handled).
5. **No organizer/admin read APIs** for dashboards: event detail w/ finance
   (`eventFinance`), balances (`organizerBalances`), payout lists, moderation
   queue, scanner event picker (`scannableEvents`) — all currently
   server-page-only.
6. **No pagination anywhere** — required for mobile list endpoints.
7. Legacy endpoints Android must **not** use: `POST /api/orders` (simulated
   card payment) and `POST /api/events` (legacy create).

### 4.2 Design/brand audit

Source of truth: `tailwind.config.ts`, `src/app/globals.css`,
`src/components/**`.

**Color tokens** (light / dark via `.dark` CSS-variable flip):

| Token | Light | Dark | Role |
|---|---|---|---|
| `coral` | `#E21B2D` (dark variant `#B91527`) | same | Brand primary — buttons, links, accents |
| `success` | `#3EB489` | same | Success states |
| `ink` | `#1E0A3C` | `#F4F2F8` | Headings / high-emphasis text |
| `body` | `#39364F` | `#C9C6D4` | Body text |
| `muted` | `#6F7287` | `#9693A5` | Secondary text |
| `surface` | `#F8F7FA` | `#241F33` | Subtle elevated surface |
| `card` | `#FFFFFF` | `#1B1727` | Cards / header |
| `canvas` | `#FFFFFF` | `#110F1A` | Page background |

**Typography**: Inter (400–800), system-ui fallback. Headings bold `ink`;
generous weight contrast.

**Shape & elevation**: rounded corners 10 px (`lg`) and 16 px (`xl`); soft
purple-tinted card shadow (`0 1px 3px rgba(30,10,60,.08), 0 4px 12px
rgba(30,10,60,.06)`); 1200 px container.

**Key UI patterns to translate:**

- **Header**: logo, language menu (es/en), dark-mode toggle, calendar picker.
- **Home**: `TopCategoryNav` — count-driven category strip (only non-empty
  categories, busiest first); `Mosaic` — 7-slot tile grid (slot 1 = hero) with
  `promoted` overlay for paid placements; `DateStrip`; `WeekendFeature`;
  `WhereToGo` venue-category circles.
- **Event cards**: cover image (fallback `CoverPlaceholder`), category badge,
  date, venue, price text.
- **Checkout**: ticket-type quantity steppers, buyer name/email, DB-priced
  totals, redirect to Stripe.
- **Ticket page**: white QR card (SVG from `qrcode` lib, payload
  `DGO1.<token>`), manual code fallback text, status badge, checked-in state.
- **Scanner** (`TicketScanner.tsx`): camera view (BarcodeDetector + jsQR
  fallback on web), manual token input, big color-coded result states.
- **Organizer/admin**: status-badge-driven tables, section cards, wizard-style
  event form.

**Material 3 mapping** (no dynamic color — fixed brand scheme):

- `primary` = coral `#E21B2D`, `onPrimary` = white; `error` kept visually
  distinct from primary (tuned Material red).
- `surface`/`background` from canvas/card/surface tokens; dark scheme from the
  `.dark` values (`#110F1A` background, `#1B1727` surface containers).
- Typography: Inter via `FontFamily` mapped onto the Material 3 type scale
  (displaySmall→bodySmall), weights 400/500/600/700.
- Shapes: `RoundedCornerShape(10.dp)` medium, `16.dp` large.
- Light + dark `ColorScheme` both shipped; follow system, manual override in
  settings (parity with the web toggle).

### 4.3 Data model & feature audit (Android representation)

Two event kinds must stay distinct end-to-end (product invariants #6/#7/#8):

```kotlin
// Discriminated union over the wire (`kind` field) and in the domain layer.
sealed interface EventItem {
    val id: String            // "show_<cuid>" | "event_<cuid>"
    val title: String
    val startsAt: Instant?    // null = TBA (scraped shows can lack dates)
    val venueName: String?
    val categories: List<String>   // taxonomy slugs (src/lib/taxonomy.ts)
    val imageUrl: String?
}

data class ScrapedShow(          // aggregator Show
    /* … */
    val priceText: String?,      // raw source label ("$12.000", "Gratis")
    val sourceUrl: String?,      // ALWAYS open externally (Custom Tab)
    val theater: TheaterRef,     // name, slug, website
) : EventItem                    // NO checkout — external link only

data class NativeEvent(          // organizer-module Event
    /* … */
    val description: String,
    val isFree: Boolean,
    val ticketTypes: List<TicketType>,  // buyable via DondeGO checkout
    val organizerName: String,
) : EventItem
```

Enums mirrored 1:1 from Prisma (server remains authoritative; client renders
only): `EventStatus` (DRAFT…COMPLETED), `TicketTypeStatus`, `TicketStatus`
(ISSUED/CHECKED_IN/CANCELLED/REFUNDED/EXPIRED/INVALIDATED), `ScanResult`
(VALID/ALREADY_USED/INVALID/CANCELLED/REFUNDED/EXPIRED/EVENT_MISMATCH/
NO_ACCESS), `PayoutStatus`, order status strings (`PENDING|PAID|FAILED|
CANCELLED|REFUNDED`). Every enum decode has an `UNKNOWN` fallback so old app
versions survive new server states.

Other mappings:

- **Money**: integer minor units everywhere; CLP = whole pesos. Represent as
  `Long amountMinor` + `String currency`; format with `es-CL` number
  formatting (mirrors `formatMoney` in `src/lib/money.ts`). **Never compute
  balances client-side** — render server-provided `eventFinance` /
  `organizerBalances` numbers only.
- **QR tokens**: opaque `qrPayload` string `DGO1.<token>` from the API;
  Android renders it as a QR bitmap and never parses or constructs it.
- **Scanner result states**: render the server `ScanOutcome {result, message,
  ticket?}` verbatim; color-code by result. No local validity decisions.
- **Category navigation**: server returns `[{category, count}]` already
  filtered (>0) and ordered (count desc, taxonomy tie-break) — the app renders
  the list *in server order* (invariant #4) and never re-sorts or backfills.
- **Timezone**: event times displayed in `America/Santiago` regardless of
  device zone (matches web), with `java.time` desugaring for minSdk 26.

### 4.4 What the app must NOT do (invariants restated for Android)

1. Never mark an order paid — only render backend order status; payment truth
   is the Stripe webhook.
2. Native payments via **Stripe Android SDK PaymentSheet** against
   backend-created PaymentIntents; no card data ever touches our code.
3. No ledger/balance math on device.
4. Category strip: render server order, no client filtering/sorting.
5. Scanner permissions and double-scan atomicity stay server-side; app is a
   thin camera + result renderer.
6. Scraped events: open `sourceUrl` in a Chrome Custom Tab; never route them
   into DondeGO checkout; never fabricate event data.
7. Native paid flow: browse → detail → select ticket types → create order
   (backend) → PaymentSheet → **poll backend order status** → tickets appear
   in account → QR at venue.

---

## 5. Android architecture proposal

### 5.1 Project location & Gradle layout

```
apps/android/                     # standalone Gradle root (not in npm workspace)
├── settings.gradle.kts
├── gradle/libs.versions.toml     # version catalog
├── build-logic/                  # convention plugins (android-app, android-lib,
│                                 #   compose, hilt)
├── app/                          # thin shell: DI graph, NavHost, MainActivity
├── core/
│   ├── designsystem/             # theme, tokens, typography, shared components
│   ├── ui/                       # EventCard, CategoryChipRow, StatusBadge, QrImage…
│   ├── network/                  # Retrofit/OkHttp, DTOs, interceptors, error mapping
│   ├── datastore/                # session/token storage, settings
│   ├── model/                    # domain models + enums
│   ├── data/                     # repositories (discovery, auth, tickets, checkout,
│   │                             #   organizer, scanner, admin)
│   └── common/                   # result types, dispatchers, time/money formatting
└── feature/
    ├── discover/                 # home feed, category browse, calendar, search
    ├── eventdetail/              # native + scraped detail screens
    ├── auth/                     # login / register
    ├── tickets/                  # my tickets, ticket QR display
    ├── checkout/                 # ticket selection, PaymentSheet, order result
    ├── organizer/                # dashboard, event wizard, ticket types, finance,
    │                             #   access grants, payouts, promotion status
    ├── scanner/                  # event picker + CameraX scan screen
    └── admin/                    # moderation queue, payout review, ticket admin
```

Keeping the Android tree at `apps/android` with its own Gradle root keeps
`npm run typecheck/lint/test` untouched and lets CI build the two stacks
independently.

**SDK targets**: minSdk 26 (java.time, EncryptedSharedPreferences comfort,
large device coverage), targetSdk/compileSdk 35 or higher. Google Play's
current target API requirement for new apps and updates is Android 15/API 35+
(source checked 2026-07-03:
<https://developer.android.com/google/play/requirements/target-sdk>). Use
Kotlin 2.x, AGP 8.x, JDK 17.

### 5.2 Core stack

| Concern | Choice |
|---|---|
| UI | Jetpack Compose + Material 3, single-activity |
| Architecture | MVVM + unidirectional data flow (`UiState` StateFlow per screen ViewModel) |
| DI | Hilt |
| Async | Coroutines + Flow |
| Networking | Retrofit + OkHttp + kotlinx.serialization (`ignoreUnknownKeys = true`) |
| Images | Coil |
| Navigation | Navigation Compose with type-safe (serializable) routes |
| Persistence | DataStore (settings); EncryptedSharedPreferences (session); Room deferred until offline-cache phase |
| Payments | Stripe Android SDK — PaymentSheet |
| QR display | ZXing core → Bitmap composable |
| QR scanning | CameraX + ML Kit `barcode-scanning` |
| External links | AndroidX Browser (Chrome Custom Tabs) |
| Time | java.time + desugaring; display TZ fixed to America/Santiago |

### 5.3 Authentication & session

- Backend change (see api doc §3.1): login/register return `{token, user}`
  in the body; `getCurrentUser()` accepts `Authorization: Bearer` first,
  cookie fallback. Same JWT, same 7-day expiry.
- Token stored in **EncryptedSharedPreferences** (AES-256, Android
  Keystore-backed master key) behind a `SessionRepository`; never in plain
  DataStore, never logged, excluded from backups (`dataExtractionRules`).
- OkHttp interceptor attaches the header; a 401 response triggers a global
  session-expired event → clears session → routes to login (preserving the
  intended destination).
- v1 accepts the 7-day re-login (matches web). A refresh-token endpoint is a
  listed backend follow-up, not a blocker.
- Role (`visitor|organizer|admin`) comes from `GET /me` at startup; it only
  gates *navigation visibility* — every action remains server-authorized.

### 5.4 Error handling

- Single `ApiResult<T>` (Success / HttpError(code, message from `{error}`
  body) / NetworkError / Unknown) mapped in one Retrofit adapter; ViewModels
  translate to UI states (inline field errors, snackbars, full-screen retry).
- The backend's consistent `{ "error": "message" }` shape (from
  `src/lib/api-error.ts`) is surfaced verbatim where user-actionable
  (e.g. "\"General\" only has 3 tickets left.").
- Checkout/scan flows get explicit terminal states, never silent failure.

### 5.5 Offline/cache approach

- Phase 1: OkHttp HTTP cache + in-memory repository cache with
  stale-while-refresh for feed/categories; tickets cached last-known so a
  purchased QR remains displayable at a venue with poor connectivity
  (QR payload is static; scan validity is still decided server-side).
- Room-backed offline feed is deliberately deferred (listed under Phase 7
  hardening) — not needed for correctness anywhere.

### 5.6 Localization strategy (English-first, Spanish-default-later)

- **All user-facing strings in `res/values/strings.xml`** (English now).
  Compose access via `stringResource(R.string.…)` only; lint rule
  `HardcodedText` promoted to error.
- Key naming mirrors the web dictionaries (`src/i18n/dictionaries/*.json`)
  where concepts overlap (e.g. `home_categories_title`), simplifying later
  translation reuse.
- Adding Spanish later = drop in `res/values-es/strings.xml` — zero
  refactoring. Making Spanish the *default* later = move the es file to
  `values/` and English to `values-en/` (keys unchanged), plus
  `<locale-config>` + per-app language support
  (`AppCompatDelegate.setApplicationLocales`) which we wire from day one so
  the per-app language picker in Android settings works immediately.
- Dates/money always formatted with explicit `es-CL`-aware formatters
  independent of UI language (CLP amounts must look right even in English).

### 5.7 Design system / theme

`core/designsystem` encodes §4.2: `DondeGoColorScheme` (light+dark, brand
coral primary, ink/body/muted/surface/card/canvas mapped to Material 3 slots),
Inter `FontFamily`, shape scale (10/16 dp), spacing scale, and shared
components (`DondeGoButton`, `EventCard`, `CategoryChip`, `StatusBadge`,
`PriceLabel`, `QrCard`, `EmptyState`). Dynamic color off. Dark theme follows
system by default with in-app override (parity with the web toggle).

### 5.8 Stripe integration (PaymentSheet)

```
[App] POST /api/v1/checkout/orders            → order PENDING, inventory reserved
[App] POST /api/v1/checkout/orders/{id}/payment-intent
                                              → { clientSecret, publishableKey }
[App] PaymentSheet.present(clientSecret)      → user pays (Stripe UI, native)
[Stripe] webhook payment_intent.succeeded     → backend marks PAID, issues
                                                tickets, posts ledger (existing
                                                finalize logic, idempotent)
[App] GET /api/v1/orders/{id}  (poll w/ backoff, ~2s×15)
                                              → status PAID + tickets[]  → success
                                              → still PENDING after timeout →
                                                "processing" screen w/ refresh
```

- PaymentSheet completion callback is treated as *"payment submitted"*, never
  *"order paid"* — the UI only flips on backend-confirmed status
  (invariant #1).
- Free orders (`total == 0`): the create-order call already returns
  `status: PAID` with tickets issued; PaymentSheet is skipped entirely.
- CLP is a Stripe zero-decimal currency; backend minor units (whole pesos)
  pass through unchanged.
- Guest checkout is supported (buyer name/email on the order, same as web);
  ephemeral keys / Customer sessions are **not required** for v1 and are
  listed as an optional follow-up for saved payment methods.
- `PaymentConfiguration.init` uses the publishable key served by the backend
  config endpoint (no keys hardcoded in the APK).

### 5.9 Camera / QR

- **Display** (visitor): render `qrPayload` via ZXing into a high-contrast
  bitmap on a white card; raise screen brightness on that screen; show the
  manual code string below (parity with web).
- **Scan** (staff): CameraX `Preview` + `ImageAnalysis` piped into ML Kit
  barcode scanner (QR format only); debounce identical payloads (~2 s);
  each hit → `POST /api/scan {eventId, value}`; render the server
  `ScanOutcome` full-screen color-coded (green VALID / amber ALREADY_USED /
  red others) with attendee name + ticket type; manual token entry fallback
  field. Runtime `CAMERA` permission with rationale + settings deep link.
  Continuous scan mode (auto-dismiss result after ~1.5 s) for door
  throughput.

### 5.10 Google Play release approach

- `applicationId dondeg.app`; AAB with Play App Signing; upload key in CI
  secrets, never in repo.
- R8/ProGuard on for release; keep rules for Stripe, kotlinx.serialization,
  Retrofit; resource shrinking on.
- `versionCode` monotonically from CI run number; `versionName` semver.
- Data safety form: collects name, email (account), purchase history
  (orders); no ads SDK, no location. Payments handled by Stripe (physical
  event tickets = physical goods/services, not digital content; Play Billing
  is for digital items, so this flow can use Stripe). Include this explanation
  in Play review notes with the official policy links in §9.
- Camera permission tied to the scanner feature
  (`<uses-feature android:required="false">` so non-camera devices can
  install for discovery/tickets).
- Tracks: internal → closed beta (organizers) → production staged rollout.
- Pre-launch: Play pre-launch report, baseline profile for startup,
  crash/ANR via Play vitals (Crashlytics optional, decide before Phase 7).

### 5.11 Testing strategy

| Layer | Tooling |
|---|---|
| Unit (repos, ViewModels, formatters, enum mapping) | JUnit + Turbine + kotlinx-coroutines-test |
| API contract | MockWebServer replaying fixture JSON captured from the real endpoints; one fixture per documented response shape in `android-api.md` |
| UI | Compose UI tests for checkout flow, scanner result states, category-strip order preservation |
| Screenshot | Roborazzi for design-system components (light/dark) |
| E2E (later) | Maestro flows: browse→detail→external link; browse→checkout(test key)→ticket QR |
| Backend | every new `/api/v1/*` endpoint lands with Vitest coverage in the existing suite (130 tests green today) |

CI: GitHub Actions workflow separate from the web one — `gradle lint test
assembleRelease` on PRs touching `apps/android/**`.

---

## 6. Backend additions plan (summary)

Full contract with request/response bodies, error cases, reuse notes, and
per-endpoint tests: **[`docs/android-api.md`](./android-api.md)**.

Headline items:

1. **Bearer auth** in `src/lib/auth.ts` (`Authorization: Bearer` first, cookie
   fallback) + token in login/register responses. Unlocks all existing
   protected routes for mobile in one change.
2. **Discovery API** (`/api/v1/feed`, `/api/v1/events`,
   `/api/v1/events/scraped/{id}`, `/api/v1/events/native/{id}`,
   `/api/v1/categories`, `/api/v1/calendar`, `/api/v1/venues`) — thin JSON wrappers over the existing
   `src/lib/data/shows.ts` / `categoryCounts.ts` query layer, with pagination.
3. **Account API** (`/api/v1/me/tickets`, `/api/v1/me/tickets/{id}`,
   `/api/v1/orders/{id}`) — ticket lists, QR payload, order status polling.
4. **PaymentSheet endpoints** (`/api/v1/checkout/orders`,
   `/api/v1/checkout/orders/{id}/payment-intent`, `/api/v1/config`) + webhook
   extension for `payment_intent.*` events reusing the existing finalize
   logic keyed by `providerPaymentIntentId`.
5. **Organizer read APIs**: dashboard, event list/detail, finance, balance,
   payout list, promotion-order status. Existing organizer mutations remain
   the write path.
6. **Scanner APIs**: scannable event picker and optional scan history; `POST
   /api/scan` remains the authoritative check-in mutation.
7. **Admin read APIs**: dashboard, moderation list/detail, payouts, orders,
   tickets, scans. Existing admin mutations remain the write path.

---

## 7. Delivery roadmap

### Phase 1 — Android production foundation + visitor discovery

**Scope**: Gradle workspace at `apps/android` (convention plugins, version
catalog, CI), `core/*` modules, design system (tokens from §4.2, light/dark),
navigation shell, localization scaffolding (`values/strings.xml`,
locale-config), discovery backend endpoints, home feed (category strip +
event list), category browse, calendar/date filter, event detail for both
kinds, **external source links via Custom Tabs**.

**Backend dependencies**: `/api/v1/feed`, `/api/v1/events`,
`/api/v1/events/scraped/{id}`, `/api/v1/events/native/{id}`,
`/api/v1/categories`, `/api/v1/calendar`, `/api/v1/venues*`
(+ `/api/v1/config`).

**Files/modules**: everything under `apps/android` (new);
`src/app/api/v1/*` (new); zero changes to existing web routes.

**Tests**: Vitest for new endpoints (category ordering, pagination, kind
discrimination, TBA dates); Android unit tests for repos/DTO mapping;
screenshot tests for EventCard/CategoryChipRow; Compose test asserting the
category strip renders in server order.

**Acceptance criteria**: install on device → browse real scraped + native
events, filter by category/date, open a scraped event's source in a Custom
Tab; category strip shows only non-empty categories busiest-first; light+dark
correct; all strings from resources; no auth required anywhere in this phase.

**Risks**: unified Show+Event pagination needs a stable sort cursor
(mitigation: deterministic `(startsAt, id)` ordering, documented in the API
spec); scraped image URLs may be broken/mixed-content (Coil fallback to a
`CoverPlaceholder` equivalent).

### Phase 2 — Account, auth, tickets, QR display

**Scope**: login/register/logout screens, secure session storage, `/me`
bootstrap, My Tickets (upcoming/past), ticket detail with QR + brightness
boost + manual code, session-expiry handling.

**Backend dependencies**: Bearer-auth change, token-returning login/register,
`/api/v1/me/tickets`, `/api/v1/me/tickets/{id}`.

**Tests**: backend — Bearer parsing, ticket ownership checks (owner, buyer
email, admin); Android — session repo, 401→login flow, QR bitmap generation
from fixture payload.

**Acceptance criteria**: register/login from the app; tickets purchased on
the web appear in My Tickets; QR renders and scans successfully with the web
scanner; token survives process death; logout wipes it.

**Risks**: cookie/Bearer duality must not regress web auth (regression tests
on existing auth suite); email-matched tickets (guest purchases) need the
ownership rule mirrored exactly.

### Phase 3 — DondeGO-native checkout with Stripe PaymentSheet

**Scope**: ticket-type selector with per-order limits/sales windows, buyer
details, order creation, PaymentSheet, order-status polling screen, free-order
short-circuit, failure/cancel/timeout states, "processing" fallback.

**Backend dependencies**: `/api/v1/checkout/orders`,
`/api/v1/checkout/orders/{id}/payment-intent`, `/api/v1/orders/{id}`, webhook
`payment_intent.*` extension, publishable key in `/api/v1/config`.

**Tests**: backend — intent creation idempotency, webhook intent-succeeded →
PAID+tickets+ledger (reusing existing finalize tests), expiry releasing
inventory; Android — checkout ViewModel state machine incl. "PaymentSheet
success but order still PENDING".

**Acceptance criteria**: end-to-end purchase with Stripe test cards on a real
device: order created PENDING → pay in PaymentSheet → app shows PAID only
after webhook lands → tickets in My Tickets → QR scannable. App never
displays "paid" without backend confirmation. Free RSVP works without
PaymentSheet.

**Risks/blockers**: **Stripe production wiring is still pending on the
backend** (test keys fine for development); webhook delivery lag on flaky
networks (mitigated by the processing screen); pending-order expiry for
abandoned PaymentSheets must release inventory (backend handles session
expiry today — the intent flow needs the same, flagged in api doc §3.4).

### Phase 4 — Organizer flow

**Scope**: organizer dashboard (events by status), event creation wizard
(mirrors web form incl. free/paid), cover upload, ticket-type management,
submit-for-review, moderation status + rejection notes display, finance
screen (server-computed numbers), payout request/cancel, scanner staff
grants, promotion *status* display (tile purchase itself stays web-only in
v1 — Custom Tab handoff to `/organizer/events/{id}/promotion`).

**Backend dependencies**: `/api/v1/organizer/dashboard`,
`/api/v1/organizer/events`, `/api/v1/organizer/events/{id}`,
`/api/v1/organizer/events/{id}/finance`, `/api/v1/organizer/balance`,
`/api/v1/organizer/payouts`, `/api/v1/organizer/promotion-orders`; existing
organizer mutations reused via Bearer.

**Tests**: backend — read-API authorization (organizer sees only own events);
Android — wizard validation parity, finance rendering from fixtures.

**Acceptance criteria**: organizer creates a draft with tickets on the phone,
submits, sees IN_REVIEW → (admin approves on web) → PUBLISHED; requests a
payout for a COMPLETED event; all balance numbers identical to the web.

**Risks**: cover upload endpoint writes to local disk — acceptable
self-hosted, breaks on Vercel; the storage-provider decision (handoff task
#5) should land before this phase ships publicly.

### Phase 5 — QR scanner flow

**Scope**: scannable-events picker, CameraX + ML Kit scan screen, result
states incl. NO_ACCESS and the free-event add-on message, manual entry,
continuous mode, scan history list (per event).

**Backend dependencies**: `/api/v1/scanner/events`; existing `POST /api/scan`;
(optional) `/api/v1/scanner/events/{id}/history`.

**Tests**: backend — scannableEvents authorization matrix (admin / organizer /
staff grant / revoked); Android — scan debounce, all eight `ScanResult`
renderings, camera-permission denial path.

**Acceptance criteria**: staff member with an email grant logs in, picks the
event, scans a real ticket → VALID (green, attendee name); second scan →
ALREADY_USED; free event without add-on → the exact server add-on message;
double-scan race stays server-atomic (two devices, one VALID).

**Risks**: low-light/damaged QR performance (ML Kit is robust; manual entry
is the fallback); INVITED→ACTIVE grant linking must keep working through the
Bearer path.

### Phase 6 — Admin/moderation flow

**Scope** (practical subset): moderation queue with approve / reject(+required
notes) / complete / archive, payout review queue (start_review / approve /
reject / mark_paid), ticket lookup with invalidate/cancel. Tile pricing and
promo-item fulfillment stay web-only.

**Backend dependencies**: `/api/v1/admin/dashboard`,
`/api/v1/admin/events`, `/api/v1/admin/events/{id}`,
`/api/v1/admin/payouts`, `/api/v1/admin/orders`,
`/api/v1/admin/tickets`, `/api/v1/admin/scans`; existing admin mutations via
Bearer.

**Tests**: backend — list authorization (403 for non-admin); Android —
transition button gating by status, required-notes validation on reject.

**Acceptance criteria**: admin moderates a submission end-to-end from the
phone; rejected event shows notes to the organizer; payout mark-paid posts
the correct ledger entries (verified via the web finance page).

**Risks**: low — mutations already exist and are status-guarded server-side.

### Phase 7 — Google Play hardening

**Scope**: release signing + Play App Signing, R8 tuning, baseline profiles,
`dataExtractionRules`, per-app language config final pass, accessibility pass
(TalkBack on checkout/scanner), Play listing (es-CL + en-US), data-safety
form, pre-launch report fixes, staged rollout plan, crash-reporting decision,
optional Room offline cache for feed/tickets, certificate-pinning decision
for the API host.

**Backend dependencies**: production `APP_URL`/API host + TLS; Stripe live
keys + dashboard webhook (handoff task #3); cron capacity fix for scrapers
(affects content freshness, not the app itself).

**Tests**: release-build smoke on min/target SDK devices, monkey testing,
full E2E Maestro suite against staging.

**Acceptance criteria**: signed AAB accepted by Play with no policy flags;
crash-free sessions >99.5% in internal testing; cold start <2 s on a
mid-range device; all earlier phases functional on the release build.

**Risks**: Play review timing; payments-in-app policy questions (mitigated:
physical-services exemption documented in the review notes).

---

## 8. Key risks & open decisions (consolidated)

1. **Every visitor read path needs new backend endpoints** — Phase 1 is
   backend-first; nothing on Android can ship against production data until
   `/api/v1` discovery lands (it is a thin wrapper over existing query code,
   so low risk, but it is on the critical path).
2. **Auth change touches shared code** (`src/lib/auth.ts`) used by every
   route — needs regression tests; coordinate with parallel sessions on this
   branch (working agreement: re-read before editing).
3. **PaymentIntent flow is new backend surface** next to the money-critical
   webhook; it reuses `finalize.ts` but the intent-abandon path needs an
   explicit inventory-release mechanism.
4. **Storage provider for cover images** unresolved (local disk today) —
   gates public organizer uploads from mobile (Phase 4 ship gate).
5. **Stripe production wiring** still pending overall (web handoff task #3) —
   blocks Phase 3 acceptance in production, not development.
6. **No pagination in existing APIs** — added in the v1 spec; the unified
   Show+Event feed needs a deterministic `(startsAt, id)` sort.
7. `dondeg.app` applicationId — **no issue**, validated in §3.
8. **Admin mobile scope** is intentionally a practical subset: moderation,
   payouts, orders/tickets, and scan visibility. Tile pricing and promotion
   fulfillment remain web-only until a dedicated mobile UX is worth the extra
   surface.

---

## 9. Official references checked

- Android application ID and namespace rules:
  <https://developer.android.com/build/configure-app-module>
- Google Play target API level requirement:
  <https://developer.android.com/google/play/requirements/target-sdk>
- Stripe Android PaymentSheet flow:
  <https://docs.stripe.com/payments/accept-a-payment?payment-ui=mobile&platform=android>
- Google Play payments policy and physical goods/services note:
  <https://support.google.com/googleplay/android-developer/answer/10281818>
