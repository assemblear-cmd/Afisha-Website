# DondeGO Mobile API Specification (v1 draft)

Companion to [`docs/android-app-plan.md`](./android-app-plan.md).
Status: **partially implemented** (updated 2026-07-05, branch
`feat/municipal-scraper-i18n`).

This document is the implementation contract for the Android app. It is
intentionally backend-first: mobile can only stay production-safe if Stripe,
ledger, scanner, moderation, and category ordering remain server-owned.

### Implementation status (2026-07-05)

**Built and shipping** (routes live under `src/app/api/v1/*` + the
`src/lib/auth.ts` Bearer change + `src/lib/mobile/events.ts` shared mapping;
covered by `tests/unit/mobile-events.test.ts`):

- Bearer auth in `getCurrentUser()` (header first, cookie fallback).
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (token in body),
  `GET /api/v1/config`.
- Discovery: `GET /api/v1/feed`, `/api/v1/events`, `/api/v1/categories`,
  `/api/v1/events/native/{id}`, `/api/v1/events/scraped/{id}`.
- Account: `GET /api/v1/me/tickets`, `/api/v1/me/tickets/{id}` (QR payload).
- Onboarding/preferences (2026-07-10): `GET /api/v1/onboarding/options`,
  `GET|PUT /api/v1/me/preferences`; `feed`/`events` and the web home page
  order preferred venues/categories first for signed-in users (§3.5).
- Scanner: `GET /api/v1/scanner/events` (picker); check-in reuses the existing
  `POST /api/scan`.

**Deferred (contract stands, not yet built):** the native Stripe PaymentSheet
surface — `POST /api/v1/checkout/orders`, `.../payment-intent`,
`GET /api/v1/orders/{id}`, and the `payment_intent.*` webhook cases (§3.4).
The Android app currently opens the **web checkout in a Custom Tab** for native
events, which keeps the order → Stripe → webhook = payment-truth invariant.
Also deferred: organizer/admin read dashboards (§3.6/§3.8) and calendar/venues
(§3.3) — the app uses role-gated web-console handoff for organizer/admin.

## 1. Conventions and invariants

- All money values are integer minor units. For CLP, one minor unit is one
  peso.
- All timestamps are ISO-8601 UTC strings. The client renders event times in
  `America/Santiago`.
- Error bodies use the existing `src/lib/api-error.ts` shape:
  `{ "error": "<human-readable message>" }`.
- Auth for mobile is `Authorization: Bearer <jwt>`. Roles are lowercase:
  `visitor`, `organizer`, `admin`. Admin passes organizer checks through
  `isOrganizer()` in `src/lib/authz.ts`.
- Mobile list endpoints use `?page=1&pageSize=20`; `pageSize` is clamped to
  50. Responses use:

  ```json
  { "items": [], "page": 1, "pageSize": 20, "total": 0, "hasMore": false }
  ```

- Unified event IDs are prefixed over the wire: `show_<cuid>` for scraped
  `Show` rows and `event_<cuid>` for native organizer `Event` rows. The
  `kind` field (`"scraped"` or `"native"`) is the discriminator.
- Stripe webhook events are the only payment truth. No endpoint lets Android
  mark an order paid.
- Ticket prices, order totals, finance, and balances are server-computed.
  Android renders numbers from the API; it does not derive balances or mutate
  ledger state.
- Category navigation is count-driven. `/api/v1/categories` returns only
  non-empty categories, ordered by count descending with taxonomy order as the
  tie-breaker; clients render the server order unchanged.
- Scanner authorization and double-scan protection stay server-side in
  `performScan()` and the atomic `Ticket.updateMany()` transition.
- Scraped/external events never enter DondeGO checkout. The CTA is the source
  URL in a browser/custom tab.

## 2. Existing route inventory

Counted from `find src/app/api -name route.ts`: **29 route files** and
31 HTTP handlers. Routes with multiple methods are shown as one row because
they share a route path.

Legend: **Mobile** = `OK` usable after Bearer auth lands, `WRAP` should be
replaced or wrapped by `/api/v1`, `NO` should not be called by Android, `N/A`
server-to-server only.

| Route file path | Methods | Auth today | What it does | Mobile |
|---|---:|---|---|---|
| `/api/admin/events/[id]/moderate` | POST | admin cookie | Approve, reject with notes, archive, or complete an event; writes moderation logs and syncs `isPublished`. | OK |
| `/api/admin/payouts/[id]` | PATCH | admin cookie | Admin payout state machine: `start_review`, `approve`, `reject`, `mark_paid`; posts ledger release/paid entries. | OK |
| `/api/admin/pricing` | PATCH | admin cookie | Updates homepage tile and promo-service prices. | NO for v1; web-only settings |
| `/api/admin/promotions/items/[id]` | PATCH | admin cookie | Approve, reject, or fulfill promotion-order items. | NO for v1; web-only fulfillment |
| `/api/admin/tickets/[id]` | PATCH | admin cookie | Invalidate or cancel issued/checked-in tickets. | OK |
| `/api/auth/login` | POST | public | Validates credentials, sets httpOnly `afisha_token` cookie, returns `{user}` only. | WRAP; mobile needs token body |
| `/api/auth/logout` | POST | cookie | Clears cookie and redirects to `/`. | NO; mobile deletes local token |
| `/api/auth/me` | GET | cookie | Returns `{user}` or `{user:null}`. | OK after Bearer support |
| `/api/auth/register` | POST | public | Creates `visitor` or `organizer`, sets cookie, returns `{user}` only. | WRAP; mobile needs token body |
| `/api/checkout` | POST | optional cookie | Creates a ticket order, reserves inventory, free-order issuance, Stripe Checkout Session URL for paid orders. | WRAP; web redirect only |
| `/api/cron/cleanup-events` | GET | `CRON_SECRET` | Server cron cleanup. | N/A |
| `/api/cron/scrape-theaters` | GET | `CRON_SECRET` | Server cron scraper trigger. | N/A |
| `/api/events/[id]` | GET | public | Published native event detail with ticket types. | WRAP; native-only, no unified shape |
| `/api/events` | GET, POST | public GET; organizer POST | GET lists published native events only, no pagination. POST is legacy event creation with old pricing schema. | WRAP for GET; NO for POST |
| `/api/orders` | POST | public | Legacy simulated card checkout. | NO |
| `/api/organizer/access/[id]` | DELETE | organizer cookie + owner | Revokes a scanner access grant. | OK |
| `/api/organizer/events/[id]/access` | POST | organizer cookie + owner | Grants scanner access by email. | OK |
| `/api/organizer/events/[id]` | PATCH | organizer cookie + owner | Edits DRAFT/REJECTED organizer events. | OK |
| `/api/organizer/events/[id]/submit` | POST | organizer cookie + owner | Moves editable event to `IN_REVIEW`. | OK |
| `/api/organizer/events/[id]/ticket-types` | POST | organizer cookie + owner | Creates a ticket type for editable events. | OK |
| `/api/organizer/events` | GET, POST | organizer cookie | GET lists owned events. POST creates a DRAFT event. | OK; v1 read wrapper adds pagination/stats |
| `/api/organizer/payouts/[id]` | DELETE | organizer cookie + owner | Cancels eligible payout and releases held ledger amount. | OK |
| `/api/organizer/payouts` | POST | organizer cookie | Requests payout for a completed event; posts ledger hold. | OK |
| `/api/organizer/ticket-types/[id]` | PATCH | organizer cookie + owner | Updates an editable ticket type. | OK |
| `/api/promotions/checkout` | POST | organizer cookie | Creates promotion order and Stripe Checkout Session URL. | WRAP later; v1 opens web flow in Custom Tab |
| `/api/promotions/quote` | POST | organizer cookie | Quotes homepage tile price and checks slot availability. | OK |
| `/api/scan` | POST | logged-in cookie | Full scan pipeline: authz, QR token parse, atomic check-in, scan history. | OK |
| `/api/uploads/event-cover` | POST | organizer cookie | Multipart cover upload to local `public/uploads/events`. | OK, storage provider still TODO |
| `/api/webhooks/stripe` | POST | Stripe signature | Stripe webhook dedupe and payment finalization. | N/A |

Missing JSON APIs today: scraped `Show` discovery, unified feed, category
counts by window, calendar day counts, venues, account tickets and QR payloads,
order status polling, organizer dashboard/detail/finance/payout list reads,
scanner event picker/history, and admin dashboard/list/detail reads. The
contract below fills those gaps.

## 3. `/api/v1` contract

### 3.1 Auth and session

Shared backend change: update `src/lib/auth.ts` so `getCurrentUser()` checks
`Authorization: Bearer <jwt>` before falling back to the `afisha_token` cookie.
Use the same `signToken()`/`verifyToken()` HS256 JWT and 7-day expiry. This
one change makes the existing protected JSON routes usable from Android.

#### POST `/api/v1/auth/register`

- Auth: public.
- Request:

  ```json
  { "name": "Jane Doe", "email": "jane@example.com", "password": "password123", "role": "visitor" }
  ```

  `role` is `visitor` or `organizer`; `admin` is rejected by
  `registerSchema`.
- Response 201:

  ```json
  { "token": "<jwt>", "user": { "id": "cl...", "email": "jane@example.com", "name": "Jane Doe", "role": "visitor" } }
  ```

- Errors: 400 validation; 409 email exists.
- Reuse: `registerSchema`, `hashPassword`, `signToken`; same create logic as
  `/api/auth/register`, without relying on the cookie for mobile.
- Tests: duplicate email 409; admin role rejected; returned token verifies;
  cookie registration route still works.

#### POST `/api/v1/auth/login`

- Auth: public.
- Request:

  ```json
  { "email": "jane@example.com", "password": "password123" }
  ```

- Response 200: same `{token,user}` shape as register.
- Errors: 400 validation; 401 invalid credentials with a single non-enumerating
  message.
- Reuse: `loginSchema`, `verifyPassword`, `signToken`.
- Tests: wrong password 401; token works against Bearer-enabled
  `/api/auth/me`; malformed JSON/validation.

#### GET `/api/auth/me` (existing, Bearer-enabled)

- Auth: optional Bearer/cookie.
- Response 200:

  ```json
  { "user": { "id": "cl...", "email": "jane@example.com", "name": "Jane Doe", "role": "visitor" } }
  ```

  or `{ "user": null }`.
- Errors: none for missing/invalid session.
- Tests: Bearer accepted; cookie fallback still accepted; invalid/expired token
  returns `user:null`.

Logout is local token deletion. Refresh tokens and server-side session
revocation are deferred.

### 3.2 Config

#### GET `/api/v1/config`

- Auth: public.
- Response 200:

  ```json
  {
    "stripePublishableKey": "pk_test_...",
    "minSupportedAppVersion": 1,
    "defaultCurrency": "CLP",
    "locales": ["es", "en"],
    "apiTimezone": "America/Santiago"
  }
  ```

- Errors: none. `stripePublishableKey` may be `null` when payments are not
  configured; Android disables native checkout in that case.
- Reuse: new `STRIPE_PUBLISHABLE_KEY` env var, `src/i18n/config.ts`.
- Tests: does not expose `STRIPE_SECRET_KEY`; stable shape when Stripe is
  unconfigured.

### 3.3 Discovery

All discovery endpoints are public and read-only. They wrap
`src/lib/data/shows.ts`, `src/lib/data/categoryCounts.ts`, Prisma `Show`/
`Theater` queries, `src/lib/weekend.ts`, and homepage promotion helpers.

#### GET `/api/v1/categories`

- Query: optional `from=YYYY-MM-DD&to=YYYY-MM-DD` for window-scoped counts.
  Default is all upcoming/TBA events.
- Response 200:

  ```json
  { "categories": [ { "slug": "concierto", "count": 87 } ] }
  ```

- Errors: 400 invalid date range.
- Server behavior: include active upcoming/TBA `Show` rows and published
  upcoming native `Event` rows; exclude zero-count categories; sort by count
  descending with `EVENT_CATEGORIES` order as the tie-breaker.
- Reuse: `getEventCategoryCounts()`; add a window-aware variant if needed.
- Tests: empty categories excluded; count-desc ordering; taxonomy tie-break;
  date-window scoping.

#### GET `/api/v1/events`

Unified paginated list of scraped shows and published native events.

- Query: `category=<slug>`, `date=YYYY-MM-DD`, `from=YYYY-MM-DD`,
  `to=YYYY-MM-DD`, `weekend=true`, `query=<text>`, `venue=<theater slug>`,
  `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      {
        "id": "show_cl...",
        "kind": "scraped",
        "title": "Hamlet",
        "startsAt": "2026-07-10T23:00:00.000Z",
        "endsAt": null,
        "venueName": "Teatro Municipal",
        "city": "Santiago",
        "categories": ["obra-de-teatro"],
        "imageUrl": "https://...",
        "priceText": "$12.000",
        "priceMinor": 12000,
        "currency": "CLP",
        "sourceUrl": "https://source.example/event"
      },
      {
        "id": "event_cl...",
        "kind": "native",
        "title": "DondeGO Showcase",
        "startsAt": "2026-07-11T22:00:00.000Z",
        "endsAt": "2026-07-12T01:00:00.000Z",
        "venueName": "Centro Cultural",
        "city": "Santiago",
        "categories": ["concierto"],
        "imageUrl": "https://...",
        "isFree": false,
        "minPriceMinor": 12000,
        "currency": "CLP"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 2,
    "hasMore": false
  }
  ```

- Filters: scraped rows require `isActive:true` and upcoming or TBA
  (`startsAt:null`); native rows require `status:'PUBLISHED'` and
  `isPublished:true`.
- Ordering: `(startsAt ASC NULLS LAST, title ASC, id ASC)` for deterministic
  pagination. TBA scraped shows sort last.
- Errors: 400 invalid date/category/page params.
- Reuse: category normalization and organizer/native merge logic from
  `src/lib/data/shows.ts`, `weekendDateRange`.
- Tests: kind discrimination; scraped items have `sourceUrl` and no ticket
  data; native items have no external checkout URL; pagination stability;
  category/date/weekend filters; TBA ordering; text query across title,
  description, venue, and city.

#### GET `/api/v1/events/scraped/{id}`

- Auth: public.
- Response 200:

  ```json
  {
    "id": "show_cl...",
    "kind": "scraped",
    "title": "Hamlet",
    "description": "Source-provided text or null",
    "startsAt": "2026-07-10T23:00:00.000Z",
    "endsAt": null,
    "venueName": "Teatro Municipal",
    "city": "Santiago",
    "categories": ["obra-de-teatro"],
    "imageUrl": "https://...",
    "priceText": "$12.000",
    "priceMinor": 12000,
    "currency": "CLP",
    "sourceUrl": "https://source.example/event",
    "theater": { "id": "cl...", "slug": "teatro-municipal", "name": "Teatro Municipal", "website": "https://..." }
  }
  ```

- Errors: 404 unknown id or inactive show.
- Server behavior: strip any checkout affordance; source URL is the only CTA.
- Reuse: Show + Theater lookup and normalization from discovery queries.
- Tests: inactive show 404; no ticketTypes/order fields; missing source URL is
  returned as `null` and client handles "details only".

#### GET `/api/v1/events/native/{id}`

- Auth: public.
- Response 200:

  ```json
  {
    "id": "event_cl...",
    "kind": "native",
    "title": "DondeGO Showcase",
    "shortDescription": "One-line summary",
    "description": "Full description",
    "startsAt": "2026-07-11T22:00:00.000Z",
    "endsAt": "2026-07-12T01:00:00.000Z",
    "venueName": "Centro Cultural",
    "address": "Av. Siempre Viva 123",
    "city": "Santiago",
    "categories": ["concierto"],
    "imageUrl": "https://...",
    "isFree": false,
    "organizer": { "id": "cl...", "name": "Studio" },
    "ticketTypes": [
      {
        "id": "cl...",
        "name": "General",
        "description": null,
        "priceMinor": 12000,
        "currency": "CLP",
        "status": "ACTIVE",
        "remaining": 37,
        "perOrderLimit": 6,
        "salesStartAt": null,
        "salesEndAt": null
      }
    ]
  }
  ```

- Errors: 404 unknown id, unpublished, or not `PUBLISHED`.
- Server behavior: `remaining = quantity - sold`, computed server-side.
- Reuse: existing `/api/events/[id]` query, category normalization from
  `src/lib/data/shows.ts`.
- Tests: unpublished native event 404; remaining never negative; inactive or
  archived ticket types excluded or marked non-buyable according to web parity.

#### GET `/api/v1/feed`

Home screen in one round trip.

- Auth: public.
- Response 200:

  ```json
  {
    "categories": [ { "slug": "concierto", "count": 87 } ],
    "hero": [
      { "id": "event_cl...", "kind": "native", "title": "Show", "promoted": true }
    ],
    "upcoming": {
      "items": [],
      "page": 1,
      "pageSize": 20,
      "total": 0,
      "hasMore": false
    },
    "weekend": { "from": "2026-07-04", "to": "2026-07-05" }
  }
  ```

- Errors: none expected; 500 only for unexpected DB failure.
- Server behavior: promoted placements (`APPROVED`/`LIVE`, covering now,
  event still published) overlay the 7-slot mosaic with `promoted:true`;
  backfill with real events only.
- Reuse: `getHomepagePlacements()`, `buildMosaicItems()`,
  `getEventCategoryCounts()`, `/api/v1/events` query.
- Tests: no empty-category hero tiles; active placements only; slot order
  mirrors web; promoted event unpublished means it is omitted.

#### GET `/api/v1/calendar`

- Query: `month=YYYY-MM` (default: current month in `America/Santiago`),
  optional `category=<slug>`.
- Response 200:

  ```json
  { "days": [ { "date": "2026-07-10", "count": 12 } ] }
  ```

- Errors: 400 invalid month/category.
- Server behavior: only days with count > 0; include scraped and native
  events; boundaries are Chile calendar days.
- Reuse: same date-key helpers used by `/calendario` pages and
  `src/lib/weekend.ts`.
- Tests: zero days omitted; month boundaries; category filter; events near UTC
  midnight count under `America/Santiago`.

#### GET `/api/v1/venues`

- Query: `category=<location category>`, `query=<text>`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "slug": "gam", "name": "GAM", "website": "https://...", "city": "Santiago", "categories": ["centro-cultural"] }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 400 invalid pagination.
- Reuse: `/teatros` page query over active `Theater` rows.
- Tests: inactive theaters excluded; category and text filters; stable sort by
  name.

#### GET `/api/v1/venues/{slug}`

- Auth: public.
- Response 200:

  ```json
  {
    "venue": { "id": "cl...", "slug": "gam", "name": "GAM", "website": "https://...", "city": "Santiago", "categories": ["centro-cultural"] },
    "upcoming": { "items": [], "page": 1, "pageSize": 20, "total": 0, "hasMore": false }
  }
  ```

- Errors: 404 unknown/inactive venue.
- Reuse: Theater lookup plus `/api/v1/events?venue=<slug>`.
- Tests: unknown slug 404; upcoming only includes active shows from that
  theater.

### 3.4 Checkout and payment

The native checkout flow uses Stripe Android PaymentSheet against backend
created PaymentIntents. The app treats the PaymentSheet callback as "submitted"
only; it polls backend order status until the webhook has finalized the order.

#### POST `/api/v1/checkout/orders`

- Auth: optional Bearer. Guest checkout is allowed and stores buyer
  name/email, matching the web checkout.
- Request:

  ```json
  {
    "eventId": "cl...",
    "buyerName": "Jane Doe",
    "buyerEmail": "jane@example.com",
    "items": [ { "ticketTypeId": "cl...", "quantity": 2 } ]
  }
  ```

- Response 201, paid order:

  ```json
  { "orderId": "cl...", "status": "PENDING", "totalMinor": 24000, "currency": "CLP" }
  ```

- Response 201, free order:

  ```json
  { "orderId": "cl...", "status": "PAID", "free": true, "totalMinor": 0, "currency": "CLP" }
  ```

- Errors: 400 invalid JSON/body, no selected tickets, event not published,
  ticket not active, sales window closed/not started, per-order limit,
  oversell, mixed currency; 404 event.
- Server behavior: reject prefixed `show_*` IDs; prices always come from
  `TicketType`; increment `sold` to reserve seats for pending paid orders;
  issue tickets immediately for free orders.
- Reuse: extract the transactional body of existing `POST /api/checkout`
  (validation, price derivation, reservation, free issuance via
  `issueTicketsForOrder`) into a shared payment/order helper used by both web
  and mobile.
- Tests: oversell protection; free order issues tickets; show IDs rejected;
  event status guard; per-order limit; sales windows; web checkout still uses
  the same helper.

#### POST `/api/v1/checkout/orders/{orderId}/payment-intent`

- Auth: optional Bearer. Order ID is an unguessable cuid, same trust model as
  the web result URL.
- Request:

  ```json
  {}
  ```

- Response 200:

  ```json
  {
    "clientSecret": "pi_..._secret_...",
    "paymentIntentId": "pi_...",
    "amountMinor": 24000,
    "currency": "clp",
    "publishableKey": "pk_test_..."
  }
  ```

- Errors: 400 free order; 404 order; 409 order not `PENDING`; 503 Stripe
  unconfigured or publishable key missing.
- Server behavior: create or reuse a non-terminal Stripe PaymentIntent for the
  order amount, with metadata `{ paymentId, kind:"TICKET_ORDER", orderId,
  eventId }`; store `providerPaymentIntentId` on the existing `Payment` row;
  return the same intent on repeated calls.
- Reuse: `getStripe()` from `src/lib/payments/stripe.ts`; add a
  `createStripePaymentIntent` helper beside `createStripeCheckoutSession`.
- Tests: idempotent reuse; PAID/CANCELLED order 409; amount re-read from DB;
  metadata includes `paymentId`; no secret key leakage.

#### Stripe webhook extension - `/api/webhooks/stripe`

Add PaymentIntent cases while leaving existing Checkout Session cases intact.

| Stripe event | Server action |
|---|---|
| `payment_intent.succeeded` | Find `Payment` by `providerPaymentIntentId`. If it has no `providerSessionId`, finalize order: `Payment.PAID`, `Order.PAID`, issue tickets, post ledger with existing idempotency keys. |
| `payment_intent.payment_failed` | Mark payment/order failed and release reserved inventory. |
| `payment_intent.canceled` | Mark payment/order cancelled and release reserved inventory. |

Guard: Checkout Sessions also have PaymentIntents. If a `Payment` row has a
`providerSessionId`, the intent handler no-ops so the existing session handler
owns finalization.

Also add stale mobile-order cleanup: pending orders with abandoned intents
older than the configured window are cancelled, the intent is cancelled if
possible, and inventory is released.

- Reuse: `handleSessionCompleted` finalization logic should be factored into
  an intent/session shared function keyed by `Payment`.
- Tests: intent success finalizes once; replay safe via `WebhookEvent`; session
  PaymentIntent skipped; failed/canceled releases inventory; ledger
  idempotency keys unchanged; stale intent cleanup.

#### GET `/api/v1/orders/{orderId}`

- Auth: optional Bearer. Access = order owner, buyer-email match on the
  authed user, admin, or unauthenticated caller with the unguessable order ID
  (matches `/checkout/result?order=<id>`).
- Response 200:

  ```json
  {
    "orderId": "cl...",
    "status": "PENDING",
    "totalMinor": 24000,
    "currency": "CLP",
    "event": { "id": "cl...", "title": "Show", "startsAt": "2026-07-11T22:00:00.000Z", "venueName": "Centro Cultural" },
    "tickets": [
      { "id": "cl...", "ticketTypeName": "General", "status": "ISSUED" }
    ]
  }
  ```

  `tickets` are returned only after tickets exist. QR tokens are not included.
- Errors: 404 unknown order.
- Reuse: `/checkout/result` page query.
- Tests: no token leakage; status changes visible after webhook; buyer email
  matching is case-insensitive for authenticated users.

### 3.5 Account and tickets

Ownership rule for ticket detail: `ticket.ownerUserId == user.id` or
`order.userId == user.id` or `order.buyerEmail == user.email`
case-insensitive, or admin.

#### GET `/api/v1/onboarding/options`

- Auth: none (public).
- Options for the two registration onboarding questions.
- Response 200:

  ```json
  {
    "categories": [{ "slug": "concierto", "count": 12 }],
    "venues": [
      {
        "slug": "teatro-municipal",
        "name": "Teatro Municipal",
        "city": "Santiago",
        "categories": ["teatro"],
        "upcomingCount": 8
      }
    ]
  }
  ```

- `categories` is count-ordered like `/api/v1/categories`. `venues` are
  active theaters ordered by upcoming activity; aggregator platforms
  (`ticketera`, `plataforma-cultural`, `productora`) are excluded.

#### GET `/api/v1/me/preferences`

- Auth: Bearer required.
- Response 200: `{ "preferredCategories": ["concierto"], "preferredVenues": ["gam"] }`

#### PUT `/api/v1/me/preferences`

- Auth: Bearer required.
- Body: `{ "preferredCategories": [...], "preferredVenues": [...] }` — each
  list optional, but at least one must be present; a provided list replaces
  the stored one. Unknown category slugs and unknown/inactive venue slugs are
  silently dropped.
- Response 200: the saved lists (same shape as GET).
- Effect: `/api/v1/feed`, `/api/v1/events` and the web home page order
  matching events first for this account (venue match > category match,
  date order within each bucket).

#### GET `/api/v1/me/tickets`

- Auth: Bearer required.
- Query: `scope=upcoming|past|all` (default `upcoming`), `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      {
        "id": "cl...",
        "status": "ISSUED",
        "checkedInAt": null,
        "ticketTypeName": "General",
        "event": { "id": "cl...", "title": "Show", "startsAt": "2026-07-11T22:00:00.000Z", "venueName": "Centro Cultural", "city": "Santiago", "imageUrl": "https://..." }
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401.
- Reuse: `/account/tickets` page query.
- Tests: owner tickets, order-user tickets, buyer-email guest tickets; other
  users excluded; no QR tokens in list response.

#### GET `/api/v1/me/tickets/{id}`

- Auth: Bearer required plus ownership rule.
- Response 200:

  ```json
  {
    "id": "cl...",
    "status": "ISSUED",
    "attendeeName": "Jane Doe",
    "attendeeEmail": "jane@example.com",
    "ticketTypeName": "General",
    "checkedInAt": null,
    "qrPayload": "DGO1.<token>",
    "event": { "id": "cl...", "title": "Show", "startsAt": "2026-07-11T22:00:00.000Z", "endsAt": "2026-07-12T01:00:00.000Z", "venueName": "Centro Cultural", "address": "Av. Siempre Viva 123", "city": "Santiago", "imageUrl": "https://..." }
  }
  ```

- QR behavior: `qrPayload` is present for `ISSUED` and `CHECKED_IN`; it is
  `null` for `CANCELLED`, `REFUNDED`, `EXPIRED`, and `INVALIDATED`.
- Errors: 401; 404 for unknown or not-owned ticket.
- Reuse: `/account/tickets/[id]` page query and `qrPayloadForToken()`.
- Tests: non-owner 404; disabled statuses return null QR; admin can read any
  ticket.

### 3.6 Organizer reads

All organizer v1 reads require Bearer + `requireOrganizer()`. Per-event reads
also use `requireEventOwnership()`; admin bypasses ownership. Mutations remain
the existing `/api/organizer/*` routes from the inventory.

#### GET `/api/v1/organizer/dashboard`

- Auth: organizer/admin.
- Response 200:

  ```json
  {
    "stats": { "soldTickets": 41, "checkedInTickets": 12, "grossMinor": 410000, "commissionMinor": 41000, "netMinor": 369000, "pendingMinor": 369000, "availableMinor": 0, "paidOutMinor": 0, "currency": "CLP" },
    "recentEvents": [ { "id": "cl...", "title": "Show", "status": "PUBLISHED", "startsAt": "2026-07-11T22:00:00.000Z" } ],
    "recentPayouts": [ { "id": "cl...", "eventTitle": "Show", "amountMinor": 100000, "status": "PENDING", "createdAt": "2026-07-03T12:00:00.000Z" } ],
    "recentPromotionOrders": [ { "id": "cl...", "eventTitle": "Show", "itemCount": 2, "totalMinor": 30000, "status": "PENDING_REVIEW", "createdAt": "2026-07-03T12:00:00.000Z" } ]
  }
  ```

- Errors: 401/403.
- Reuse: `/organizer` page queries and `organizerBalances()`.
- Tests: organizer sees only own aggregates; admin may pass with explicit
  organizer context or sees admin-owned data only if no context is provided
  (choose and pin behavior in implementation).

#### GET `/api/v1/organizer/events`

- Auth: organizer/admin.
- Query: `status=...`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "title": "Show", "status": "DRAFT", "startsAt": "2026-07-11T22:00:00.000Z", "venueName": "Centro Cultural", "isFree": false, "ticketsSold": 12, "ticketCapacity": 100, "checkedInTickets": 3 }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid status/page.
- Reuse: existing `GET /api/organizer/events` plus `/organizer/events` page
  ticket summary query.
- Tests: only own events; status filter; sold/capacity math from ticket types.

#### GET `/api/v1/organizer/events/{id}`

- Auth: organizer/admin + ownership.
- Response 200: editable event fields, status, moderation notes, ticket
  summaries, scanner access, and finance.

  ```json
  {
    "event": {
      "id": "cl...",
      "title": "Show",
      "shortDescription": null,
      "description": "Full text",
      "category": "concierto",
      "venueName": "Centro Cultural",
      "address": "Av. Siempre Viva 123",
      "city": "Santiago",
      "startsAt": "2026-07-11T22:00:00.000Z",
      "endsAt": "2026-07-12T01:00:00.000Z",
      "imageUrl": "https://...",
      "status": "DRAFT",
      "isPublished": false,
      "isFree": false,
      "scannerAddonPaid": false,
      "moderationNotes": null,
      "contactName": "Jane Doe",
      "contactEmail": "jane@example.com",
      "contactPhone": null
    },
    "ticketTypes": [ { "id": "cl...", "name": "General", "status": "ACTIVE", "priceMinor": 12000, "currency": "CLP", "quantity": 100, "sold": 12, "perOrderLimit": 6, "salesStartAt": null, "salesEndAt": null } ],
    "scannerAccesses": [ { "id": "cl...", "email": "staff@example.com", "status": "ACTIVE", "userId": "cl...", "createdAt": "2026-07-03T12:00:00.000Z" } ],
    "finance": { "soldTickets": 12, "checkedInTickets": 3, "grossMinor": 120000, "commissionMinor": 12000, "netMinor": 108000, "availableMinor": 0, "paidOutMinor": 0, "isCompleted": false, "currency": "CLP" }
  }
  ```

- Errors: 401/403/404.
- Reuse: `/organizer/events/[id]` page query, `eventFinance()`,
  `requireEventOwnership()`.
- Tests: cross-organizer 403; admin bypass; rejected event includes notes;
  editable statuses match `isEventEditable()`.

#### GET `/api/v1/organizer/events/{id}/finance`

- Auth: organizer/admin + ownership.
- Response 200:

  ```json
  {
    "finance": { "soldTickets": 41, "checkedInTickets": 12, "grossMinor": 410000, "commissionMinor": 41000, "netMinor": 369000, "paidOutMinor": 0, "availableMinor": 0, "isCompleted": false, "currency": "CLP" },
    "ledger": [ { "id": "cl...", "type": "ORGANIZER_NET_CREDIT", "amountMinor": 108000, "currency": "CLP", "description": "Organizer net revenue (90%)", "createdAt": "2026-07-03T12:00:00.000Z" } ],
    "payouts": [ { "id": "cl...", "amountMinor": 100000, "status": "PENDING", "createdAt": "2026-07-03T12:00:00.000Z", "paidAt": null } ]
  }
  ```

- Errors: 401/403/404.
- Reuse: `/organizer/events/[id]/finance` page, `eventFinance()`.
- Tests: numbers match ledger fixtures; `availableMinor` is zero unless event
  is `COMPLETED`; ledger is read-only.

#### GET `/api/v1/organizer/balance`

- Auth: organizer/admin.
- Response 200:

  ```json
  { "grossMinor": 410000, "commissionMinor": 41000, "netMinor": 369000, "pendingMinor": 369000, "availableMinor": 0, "paidOutMinor": 0, "currency": "CLP" }
  ```

- Errors: 401/403.
- Reuse: `organizerBalances()`.
- Tests: no client-side math; pending/available split by completed events.

#### GET `/api/v1/organizer/payouts`

- Auth: organizer/admin.
- Query: `status=...`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "eventId": "cl...", "eventTitle": "Show", "amountMinor": 100000, "currency": "CLP", "status": "PENDING", "notes": null, "adminNotes": null, "createdAt": "2026-07-03T12:00:00.000Z", "paidAt": null }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid status.
- Reuse: `/organizer/payouts` page query.
- Tests: only own payouts; cancelable statuses match UI.

#### GET `/api/v1/organizer/promotion-orders`

- Auth: organizer/admin.
- Query: `eventId=<id>`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "eventId": "cl...", "eventTitle": "Show", "itemCount": 2, "totalMinor": 30000, "currency": "CLP", "status": "PENDING_REVIEW", "createdAt": "2026-07-03T12:00:00.000Z" }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 404 if `eventId` is not owned.
- Reuse: dashboard/promotion page queries. Promotion checkout itself remains
  the existing web Checkout Session route in a Custom Tab for v1.
- Tests: only own promotion orders; event filter ownership.

### 3.7 Scanner

#### GET `/api/v1/scanner/events`

- Auth: Bearer required; any role may call, result filters by permission.
- Response 200:

  ```json
  {
    "events": [
      { "id": "cl...", "title": "Show", "startsAt": "2026-07-11T22:00:00.000Z", "isFree": false, "scannerEnabled": true }
    ]
  }
  ```

- Errors: 401.
- Reuse: `scannableEvents()` and `scannerEnabledForEvent()` from
  `src/lib/authz.ts`.
- Tests: admin sees all published; organizer sees own published; staff sees
  INVITED/ACTIVE grants; REVOKED excluded; free event without add-on returns
  `scannerEnabled:false`.

#### POST `/api/scan` (existing)

- Auth: Bearer after shared auth change.
- Request:

  ```json
  { "eventId": "cl...", "value": "DGO1.<token>" }
  ```

  The existing route records device info from the request `User-Agent`, so the
  Android OkHttp client should set a useful app/device user agent rather than
  sending a body field.
- Response 200:

  ```json
  {
    "result": "VALID",
    "message": "Ticket is valid. Checked in.",
    "ticket": { "id": "cl...", "attendeeName": "Jane Doe", "ticketTypeName": "General", "eventTitle": "Show", "checkedInAt": "2026-07-03T12:00:00.000Z" }
  }
  ```

- Errors: 401; validation 400. Business failures are mostly 200 with
  `result` values (`ALREADY_USED`, `INVALID`, `NO_ACCESS`, etc.).
- Reuse: existing route and `performScan()`.
- Tests already exist for scan decisions; add Bearer path coverage.

#### GET `/api/v1/scanner/events/{id}/history`

- Auth: Bearer + `canScanEvent()`.
- Query: `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "result": "VALID", "attendeeName": "Jane Doe", "ticketTypeName": "General", "scannedByEmail": "staff@example.com", "notes": null, "createdAt": "2026-07-03T12:00:00.000Z" }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403/404.
- Reuse: `/admin/scans` query filtered by event, `canScanEvent()`.
- Tests: no-access 403; staff sees only granted event; admin/organizer access.

### 3.8 Admin reads

All admin v1 reads require Bearer + `requireAdmin()`. Admin mutations remain
the existing `/api/admin/*` routes from the inventory.

#### GET `/api/v1/admin/dashboard`

- Auth: admin.
- Response 200:

  ```json
  {
    "queues": { "eventSubmissions": 3, "promotionItems": 2, "payoutRequests": 1 },
    "finance": { "grossMinor": 410000, "commissionMinor": 41000, "organizerPayableMinor": 369000, "payoutHoldsMinor": 100000, "currency": "CLP" },
    "recentOrders": [ { "id": "cl...", "eventTitle": "Show", "buyerEmail": "jane@example.com", "totalMinor": 24000, "currency": "CLP", "status": "PAID", "createdAt": "2026-07-03T12:00:00.000Z" } ],
    "recentScans": [ { "id": "cl...", "eventTitle": "Show", "scannedByEmail": "staff@example.com", "result": "VALID", "createdAt": "2026-07-03T12:00:00.000Z" } ]
  }
  ```

- Errors: 401/403.
- Reuse: `/admin` page queries and ledger group-bys.
- Tests: non-admin 403; finance totals match page query.

#### GET `/api/v1/admin/events`

- Auth: admin.
- Query: `filter=created|review|published|rejected|archived|all`,
  `status=<EventStatus>`, `page`, `pageSize`. Default `filter=review`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "title": "Show", "status": "IN_REVIEW", "organizerName": "Studio", "organizerEmail": "studio@example.com", "startsAt": "2026-07-11T22:00:00.000Z", "venueName": "Centro Cultural", "isFree": false, "submittedAt": "2026-07-03T12:00:00.000Z", "moderationNotes": null }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid filter/status.
- Reuse: `/admin/events` page filter definitions. `submittedAt` is computed
  from the most recent `EventModerationLog` with action `IN_REVIEW`; return
  `null` when no submit log exists.
- Tests: filter maps match page; non-admin 403; submitted timestamp derives
  from moderation logs.

#### GET `/api/v1/admin/events/{id}`

- Auth: admin.
- Response 200:

  ```json
  {
    "event": { "id": "cl...", "title": "Show", "status": "IN_REVIEW", "description": "Full text", "startsAt": "2026-07-11T22:00:00.000Z", "endsAt": "2026-07-12T01:00:00.000Z", "venueName": "Centro Cultural", "address": "Av. Siempre Viva 123", "city": "Santiago", "isFree": false, "scannerAddonPaid": false, "moderationNotes": null, "organizer": { "id": "cl...", "name": "Studio", "email": "studio@example.com" }, "contactName": "Jane Doe", "contactEmail": "jane@example.com", "contactPhone": null },
    "ticketTypes": [ { "id": "cl...", "name": "General", "priceMinor": 12000, "currency": "CLP", "sold": 12, "quantity": 100, "status": "ACTIVE" } ],
    "finance": { "soldTickets": 12, "checkedInTickets": 3, "grossMinor": 120000, "commissionMinor": 12000, "netMinor": 108000, "availableMinor": 0, "paidOutMinor": 0, "isCompleted": false, "currency": "CLP" },
    "moderationLogs": [ { "id": "cl...", "action": "approve", "actorEmail": "admin@dondego.test", "notes": null, "createdAt": "2026-07-03T12:00:00.000Z" } ]
  }
  ```

- Errors: 401/403/404.
- Reuse: `/admin/events/[id]` page query and `eventFinance()`.
- Tests: 404 unknown; log ordering; reject action requires notes on existing
  mutation route.

#### GET `/api/v1/admin/payouts`

- Auth: admin.
- Query: `status=<PayoutStatus>`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "organizerName": "Studio", "organizerEmail": "studio@example.com", "eventId": "cl...", "eventTitle": "Show", "eventStatus": "COMPLETED", "amountMinor": 100000, "currency": "CLP", "status": "PENDING", "notes": null, "adminNotes": null, "createdAt": "2026-07-03T12:00:00.000Z", "paidAt": null }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid status.
- Reuse: `/admin/payouts` page query.
- Tests: status filter; non-admin 403.

#### GET `/api/v1/admin/orders`

- Auth: admin.
- Query: `status=<order status>`, `query=<buyer email or event title>`,
  `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "eventId": "cl...", "eventTitle": "Show", "buyerName": "Jane Doe", "buyerEmail": "jane@example.com", "totalMinor": 24000, "currency": "CLP", "status": "PAID", "paymentStatus": "PAID", "paymentProvider": "stripe", "ticketCount": 2, "createdAt": "2026-07-03T12:00:00.000Z" }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid status.
- Reuse: `/admin/tickets` recent orders query.
- Tests: search by buyer/event; no ticket tokens; non-admin 403.

#### GET `/api/v1/admin/tickets`

- Auth: admin.
- Query: `status=<TicketStatus>`, `eventId=<id>`,
  `query=<attendee email/name>`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "eventId": "cl...", "eventTitle": "Show", "ticketTypeName": "General", "attendeeName": "Jane Doe", "attendeeEmail": "jane@example.com", "status": "ISSUED", "checkedInAt": null, "createdAt": "2026-07-03T12:00:00.000Z" }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid status.
- Reuse: `/admin/tickets` recent tickets query.
- Tests: filters; no QR token leakage in admin list; existing ticket mutation
  still guards status transitions.

#### GET `/api/v1/admin/scans`

- Auth: admin.
- Query: `eventId=<id>`, `result=<ScanResult>`, `page`, `pageSize`.
- Response 200:

  ```json
  {
    "items": [
      { "id": "cl...", "eventId": "cl...", "eventTitle": "Show", "result": "VALID", "attendeeEmail": "jane@example.com", "ticketTypeName": "General", "scannedByEmail": "staff@example.com", "notes": null, "createdAt": "2026-07-03T12:00:00.000Z" }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
  ```

- Errors: 401/403; 400 invalid result.
- Reuse: `/admin/scans` page query.
- Tests: filters; non-admin 403.

## 4. Endpoint to phase matrix

| Endpoint or change | Phase | Flow |
|---|---:|---|
| `GET /api/v1/config` | 1 | app bootstrap, checkout config |
| `GET /api/v1/categories` | 1 | visitor discovery |
| `GET /api/v1/events`, detail endpoints | 1 | visitor discovery/detail |
| `GET /api/v1/feed` | 1 | home |
| `GET /api/v1/calendar` | 1 | date browsing |
| `GET /api/v1/venues`, `GET /api/v1/venues/{slug}` | 1 | venue browsing |
| Bearer support in `src/lib/auth.ts` | 2 | all authenticated flows |
| `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | 2 | auth |
| `GET /api/v1/me/tickets`, `GET /api/v1/me/tickets/{id}` | 2 | tickets/QR |
| `POST /api/v1/checkout/orders` | 3 | native checkout |
| `POST /api/v1/checkout/orders/{id}/payment-intent` | 3 | native checkout |
| webhook `payment_intent.*` extension | 3 | payment truth |
| `GET /api/v1/orders/{id}` | 3 | order polling |
| Organizer dashboard/list/detail/finance/balance/payout/promotion reads | 4 | organizer |
| `GET /api/v1/scanner/events`, scanner history | 5 | scanner |
| Admin dashboard/events/payouts/orders/tickets/scans reads | 6 | admin |

Existing organizer/admin/scanner/upload mutation routes are consumed directly
via Bearer from the phase listed in the app plan.

## 5. Cross-cutting backend work

1. **Bearer auth**: import `headers()` from `next/headers`, parse
   `Authorization: Bearer`, verify with existing JWT code, then fallback to
   cookie. Add tests for both paths.
2. **Token-returning mobile auth routes**: keep cookie routes for web; v1
   routes return tokens in the body.
3. **`STRIPE_PUBLISHABLE_KEY`**: add env var and `.env.example` entry. Never
   expose `STRIPE_SECRET_KEY`.
4. **Pagination helper**: parse/clamp page params and return the shared
   envelope.
5. **Shared checkout core**: extract existing order/reservation/free-order
   logic from `/api/checkout`.
6. **PaymentIntent helpers**: add Stripe helper plus webhook finalization by
   `providerPaymentIntentId`.
7. **Stale order cleanup**: mobile PaymentIntent abandonment must release
   inventory like Checkout Session expiry.
8. **Rate limiting**: add lightweight IP/user windows on auth and checkout
   endpoints before public mobile launch.
9. **No CORS requirement**: native clients are not browsers; keep browser CORS
   closed unless a web consumer is explicitly added.

## 6. Official references checked

- Android application ID and namespace rules:
  <https://developer.android.com/build/configure-app-module>
- Google Play target API level requirement:
  <https://developer.android.com/google/play/requirements/target-sdk>
- Stripe Android PaymentSheet flow:
  <https://docs.stripe.com/payments/accept-a-payment?payment-ui=mobile&platform=android>
- Google Play payments policy and physical goods/services note:
  <https://support.google.com/googleplay/android-developer/answer/10281818>
