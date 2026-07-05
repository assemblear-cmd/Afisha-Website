# DondeGO — project summary for a fresh chat

Дата обновления: 2026-07-05 16:58 America/Santiago
Репозиторий: `/Users/skif/Documents/GitHub/Afisha-Website`
Ветка: `main`
Последний коммит: `c02a3f9 feat(mobile): Events tab (organized + liked), feed likes, top-bar menu`

Этот документ нужен как самодостаточная память проекта для нового чата без
контекста. Он описывает продукт, архитектуру, деплой, домен, Android-приложение,
операционные команды, последние изменения и ближайшие риски.

---

## 1. Коротко о продукте

**DondeGO** — афиша событий Сантьяго, Чили, совмещенная с self-service
платформой для организаторов.

В продукте есть две линии:

1. **Агрегатор событий**: DondeGO собирает события из внешних источников
   (театры, площадки, билетные операторы, культурные центры) и показывает их
   пользователям. Для таких событий покупка билета ведет на внешний сайт
   источника.
2. **Собственная билетная платформа**: организатор создает событие в DondeGO,
   продает билеты через DondeGO, а персонал проверяет билеты через QR/сканер.

Основная локаль: `es`. Также есть `en`.
Валюта: `CLP` — чилийское песо, целые значения без копеек.

---

## 2. Бизнес-модель

Главная монетизация:

- DondeGO берет **10% комиссии** с каждой продажи билета.
- Организатор получает 90%.
- Комиссия считается на сервере в `src/lib/finance/commission.ts`.
- Балансы организаторов ведутся через внутренний ledger:
  `src/lib/finance/ledger.ts`.

Дополнительная монетизация:

- Платные промо-плитки на главной странице.
- Промо-услуги: Instagram post/story, Telegram repost.
- Платный scanner add-on для бесплатных событий.

Критический финансовый инвариант:

- Единственный источник правды об оплате — **Stripe webhook**.
- Клиент, редирект после оплаты и Android-приложение не должны сами помечать
  заказ оплаченным.
- Билеты, ledger и финальное состояние платежа создаются/меняются сервером.

---

## 3. Текущий production-статус

Проект уже задеплоен и работает.

Production URL:

- `https://dondego.cl`
- `https://www.dondego.cl`
- fallback Vercel domain: `https://afisha-website.vercel.app`

Проверено 2026-07-05:

- `curl -I https://dondego.cl` возвращает `HTTP/2 200`.
- `curl -I https://www.dondego.cl` возвращает `HTTP/2 200`.
- `curl https://dondego.cl/api/events` возвращает JSON со списком событий.
- Vercel runtime error из-за неправильного `DATABASE_URL` уже исправлен.

Vercel:

- Project: `afisha-website`
- Owner/team: `assemblear-4979s-projects`
- Project ID: `prj_1PpjPKwIeANUSX2afmjfF4uDtPOK`
- Framework preset: Next.js
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: Next.js default
- Node.js Version на Vercel: `24.x`

Database:

- Production DB создана через **Neon Postgres Free** в Vercel Marketplace.
- Neon resource name: `dondego-postgres`
- Neon external resource id: `holy-frog-13761020`
- Neon store id: `store_mNP9GobNwAlHRP9t`
- Prisma schema уже применена к Neon через `npx prisma db push`.
- Seed уже выполнен против production DB.

Production seed создал:

- 197 theaters/sources.
- 4 shows из seed.
- 7 homepage tiles.
- 4 promo services.
- admin user: `admin@dondego.cl`.
- 3 demo users.
- 19 native events.
- 31 ticket types.

Секреты не хранить в репозитории. Значения уже заведены в Vercel env.

---

## 4. Домен и DNS

Домен куплен на GoDaddy:

- `dondego.cl`

Vercel-домены добавлены и верифицированы:

- `dondego.cl`
- `www.dondego.cl`

DNS по Google resolver на момент проверки:

```text
dondego.cl A      64.29.17.1
dondego.cl A      216.198.79.1
www.dondego.cl CNAME b60f1a4a55fe6ac4.vercel-dns-017.com.
```

Правильные GoDaddy records:

| Type | Name | Value | Notes |
|---|---|---|---|
| A | `@` | `216.198.79.1` | Vercel apex |
| A | `@` | `64.29.17.1` | Vercel apex |
| CNAME | `www` | `b60f1a4a55fe6ac4.vercel-dns-017.com` | Vercel www |

Не трогать без необходимости:

- NS records GoDaddy.
- SOA.
- `_domainconnect`.
- `_dmarc`.

Проверочные команды:

```bash
dig @8.8.8.8 +short A dondego.cl
dig @8.8.8.8 +short CNAME www.dondego.cl
curl -I https://dondego.cl
curl -I https://www.dondego.cl
npx --yes vercel domains verify dondego.cl
npx --yes vercel domains verify www.dondego.cl
```

---

## 5. Архитектура

```text
Web browser / Android app
        |
        | HTTPS
        v
Next.js 14 App Router
        |
        | Server Components, Route Handlers, API v1
        v
Business logic in src/lib/*
        |
        | Prisma Client
        v
PostgreSQL / Neon production DB

External integrations:
- Stripe for checkout and webhooks.
- Google OAuth ID token verification for mobile Google sign-in.
- External event sources for scraping.
```

Main stack:

| Layer | Technology |
|---|---|
| Web/API | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, CSS variables, dark mode via class |
| ORM/DB | Prisma 5, PostgreSQL |
| Auth | JWT via `jose`, password hashing via `bcryptjs` |
| Payments | Stripe Checkout/webhooks |
| Mobile | Native Android, Kotlin, Jetpack Compose |
| Tests | Vitest, Playwright |
| Hosting | Vercel |
| Production DB | Neon Postgres |

---

## 6. Data model

Schema: `prisma/schema.prisma`.

The schema has two main domains in one database.

Aggregator domain:

- `Theater`: external venue/source.
- `Show`: scraped/external event from a source.

Commerce domain:

- `User`: visitor/organizer/admin.
- `Event`: native DondeGO event created by a user.
- `TicketType`: ticket inventory and price.
- `Order`: purchase order.
- `OrderItem`: ticket line items.
- `Ticket`: issued ticket with random token for QR.
- `TicketScan`: scan/check-in history.
- `EventScannerAccess`: staff access by event/email.
- `Payment`: Stripe payment/session state.
- `WebhookEvent`: idempotency for Stripe webhook events.
- `LedgerTransaction`: internal CLP ledger for organizer balances.
- `PayoutRequest`: manual payout workflow.
- `HomepageTile`, `HomepageTilePlacement`, `PromoService`,
  `PromotionOrder`, `PromotionOrderItem`: promotion/ads module.
- `EventLike`: mobile likes for unified feed items.

Important enums:

- `EventStatus`: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`,
  `PUBLISHED`, `REJECTED`, `CANCELLED`, `ARCHIVED`, `COMPLETED`.
- `TicketStatus`: `ISSUED`, `CHECKED_IN`, `CANCELLED`, `REFUNDED`,
  `EXPIRED`, `INVALIDATED`.
- `ScanResult`: `VALID`, `ALREADY_USED`, `INVALID`, `CANCELLED`,
  `REFUNDED`, `EXPIRED`, `EVENT_MISMATCH`, `NO_ACCESS`.
- `PaymentStatus`: `PENDING`, `REQUIRES_ACTION`, `PAID`, `FAILED`,
  `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- `LedgerType`: gross sale, commission, organizer net credit, payout hold,
  payout release, payout paid, adjustments.

Important modeling notes:

- Scraped shows and native events are separate tables.
- Mobile API exposes unified IDs:
  - `show_<id>` for `Show`
  - `event_<id>` for `Event`
- Ticket QR payload is based on a random ticket token and does not expose buyer
  data.
- Double scan protection is server-side and atomic.

---

## 7. Web routes

Main public routes:

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/events` | Native event list/search |
| `/events/[id]` | Native event detail |
| `/events/[id]/checkout` | Web checkout |
| `/fin-de-semana` | Weekend listing |
| `/calendario` and `/calendario/[date]` | Calendar |
| `/teatros` | Venue/source listing |
| `/lectures` | Lectures/content page |
| `/login`, `/register` | Auth |
| `/account/tickets` | User tickets |
| `/account/tickets/[id]` | Ticket detail |

Organizer routes:

| Route | Purpose |
|---|---|
| `/organizer` | Organizer home |
| `/organizer/events` | User's events |
| `/organizer/events/new` | Create event |
| `/organizer/events/[id]` | Event dashboard |
| `/organizer/events/[id]/tickets` | Ticket management |
| `/organizer/events/[id]/promotion` | Promotion builder |
| `/organizer/events/[id]/access` | Scanner access |
| `/organizer/events/[id]/finance` | Event finance |
| `/organizer/scanner` | Scanner |
| `/organizer/payouts` | Payout requests |

Admin routes:

| Route | Purpose |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/events` | Moderation |
| `/admin/events/[id]` | Event moderation detail |
| `/admin/finance` | Finance overview |
| `/admin/payouts` | Payout review |
| `/admin/pricing` | Promo pricing |
| `/admin/promotions` | Promo order review |
| `/admin/scanner` | Admin scanner |
| `/admin/scans` | Scan history |
| `/admin/tickets` | Ticket admin |

Legacy `/dashboard/*` routes exist and redirect/use organizer surfaces.

---

## 8. API routes

Important web/server routes:

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Web registration, cookie session |
| `POST /api/auth/login` | Web login, cookie session |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current user; Bearer is also supported |
| `GET /api/events` | Native published events |
| `POST /api/events` | Legacy event creation |
| `GET /api/events/[id]` | Native event detail |
| `POST /api/checkout` | Ticket checkout creation |
| `POST /api/webhooks/stripe` | Stripe webhook, payment truth |
| `GET /api/cron/scrape-theaters` | Scraper cron, requires `CRON_SECRET` |
| `GET /api/cron/cleanup-events` | Cleanup cron, requires `CRON_SECRET` |
| `POST /api/scan` | Ticket scan/check-in |
| `POST /api/uploads/event-cover` | Local event cover upload |

Organizer/admin APIs live under:

- `/api/organizer/*`
- `/api/admin/*`
- `/api/promotions/*`

Mobile API v1:

| Route | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Mobile registration, returns JWT |
| `POST /api/v1/auth/login` | Mobile login, returns JWT |
| `POST /api/v1/auth/google` | Mobile Google sign-in |
| `GET /api/v1/config` | Public app config |
| `GET /api/v1/categories` | Count-driven categories |
| `GET /api/v1/feed` | Unified feed |
| `GET /api/v1/events` | Unified paginated events |
| `GET /api/v1/events/native/[id]` | Native event detail |
| `GET /api/v1/events/scraped/[id]` | Scraped event detail |
| `GET /api/v1/me/events` | Organized/owned events for mobile |
| `GET /api/v1/me/likes` | User likes |
| `POST /api/v1/me/likes` | Toggle/add likes |
| `GET /api/v1/me/tickets` | My tickets |
| `GET /api/v1/me/tickets/[id]` | Ticket + QR payload |
| `GET /api/v1/scanner/events` | Events available for scanner |

Deferred native mobile checkout:

- Native Stripe PaymentSheet endpoints are designed in `docs/android-api.md`,
  but not fully implemented. Android currently opens web checkout in a Custom
  Tab for native DondeGO events.

---

## 9. Android app

Path: `apps/android`.

App:

- Name: `DondeGO`
- `applicationId`: `dondeg.app`
- Native Kotlin + Jetpack Compose.
- minSdk: 26
- targetSdk: 36
- compileSdk: 37
- Kotlin: 2.3.10
- AGP: 9.2.1

Module layout:

```text
apps/android/
  app/
  core/common
  core/model
  core/network
  core/data
  core/designsystem
  feature/discover
  feature/eventdetail
  feature/auth
  feature/tickets
  feature/scanner
  feature/organizer
  feature/admin
  feature/checkout
```

Implemented:

- Discovery/feed.
- Events tab with organized + liked sections.
- Event detail for native and scraped events.
- Login/register.
- Google sign-in if built with `-PdondegoGoogleClientId=<web-client-id>`.
- JWT stored locally and sent as Bearer token.
- My tickets with QR rendering via ZXing.
- Scanner event picker and manual/pasted token check-in.
- Organizer/admin role-gated handoff to web console via Custom Tab.
- In-app language menu.

Deferred:

- Native Stripe PaymentSheet.
- Camera scanner via CameraX/ML Kit.
- Fully native organizer/admin dashboards.

Debug API host:

- Default emulator URL: `http://10.0.2.2:3000/`.
- For real phone over USB, use `adb reverse tcp:3000 tcp:3000` and keep the app
  configured against localhost/127.0.0.1 behavior.

Release API host gotcha:

- `apps/android/app/build.gradle.kts` currently has release
  `API_BASE_URL = "https://dondego.app/"`.
- Production domain is `https://dondego.cl/`.
- Before Play release, change release API base to `https://dondego.cl/`, or
  add a Gradle property override for release builds.

Build commands:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
./gradlew :app:assembleDebug
./gradlew :app:lintDebug
./gradlew test
```

Build debug against production:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
./gradlew :app:assembleDebug -PdondegoApiBase=https://dondego.cl/
```

Build release AAB for Google Play after signing is configured:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
./gradlew :app:bundleRelease -PdondegoApiBase=https://dondego.cl/
```

Current gotcha: the command above is the desired shape, but the current
`release` block does not read `dondegoApiBase` yet. Fix
`apps/android/app/build.gradle.kts` first, or it will still build with the
hardcoded `https://dondego.app/`.

Signing is not fully wired yet. Do not commit keystores/passwords.

---

## 10. Local development

Repo root:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
npm install
npm run dev
```

For physical phone on the same network:

```bash
npm run dev -- --hostname 0.0.0.0
```

For physical phone over USB with ADB reverse:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
$ADB reverse --remove-all || true
$ADB reverse tcp:3000 tcp:3000
$ADB shell am force-stop dondeg.app
$ADB shell am start -n dondeg.app/.MainActivity
```

Verify local server from phone through USB:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
$ADB shell 'curl -sS --max-time 8 http://127.0.0.1:3000/api/events | head -c 220; echo'
```

Known Android device used during testing:

- Samsung Android device id: `R3CWA0H83HM`
- Model: `SM_S918U1`
- Package: `dondeg.app`
- Activity: `dondeg.app/.MainActivity`

---

## 11. Environment variables

Required or known variables:

```text
DATABASE_URL
AUTH_SECRET
CRON_SECRET
GOOGLE_CLIENT_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
APP_URL
ADMIN_SEED_EMAIL
ADMIN_SEED_PASSWORD
```

Additional Neon/Vercel Postgres variables created by marketplace integration:

```text
POSTGRES_USER
POSTGRES_DATABASE
PGHOST_UNPOOLED
PGDATABASE
NEON_PROJECT_ID
DATABASE_URL_UNPOOLED
POSTGRES_URL_NO_SSL
POSTGRES_PASSWORD
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
PGPASSWORD
PGHOST
PGUSER
POSTGRES_HOST
```

Important:

- Do not commit real secrets.
- `.env.example` documents expected names.
- Vercel env contains production values.
- `vercel env pull` does not reveal sensitive values in plain text, so seed
  scripts that depend on `ADMIN_SEED_PASSWORD` may need the password provided
  explicitly in shell when updating production admin credentials.

Check env names:

```bash
npx --yes vercel env ls --scope assemblear-4979s-projects
```

---

## 12. Production DB operations

Pull production env into a temporary file:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
tmp=$(mktemp /tmp/vercel-prod-env.XXXXXX)
npx --yes vercel env pull "$tmp" --environment production --yes
set -a
. "$tmp"
set +a
rm -f "$tmp"
```

Apply schema:

```bash
npx prisma generate
npx prisma db push
```

Seed:

```bash
npm run db:seed
```

Scraper/sync commands:

```bash
npm run db:sync-theaters
npm run db:sync-commerce
npm run db:scrape
npm run db:cleanup-events
```

Do not use destructive DB reset on production unless explicitly intended.

---

## 13. Deployment commands

Link local folder to Vercel project:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
npx --yes vercel link --yes --project afisha-website
```

Production redeploy:

```bash
npx --yes vercel redeploy afisha-website.vercel.app --target production
```

Verify:

```bash
curl -I https://dondego.cl
curl -sS https://dondego.cl/api/events | head -c 500
npx --yes vercel logs afisha-website.vercel.app --since 10m --level error --expand --limit 20
```

Vercel cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-theaters",
      "schedule": "0 6 * * *"
    }
  ]
}
```

---

## 14. Tests and checks

Scripts from `package.json`:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Build script:

```bash
prisma generate && next build
```

Known state:

- Vitest suite was previously green with 144 unit tests in handoff docs.
- `next lint` had one pre-existing `<img>` warning in
  `src/app/events/[id]/page.tsx`.
- Production was verified after Neon setup and redeploy.

Before any meaningful handoff/PR/deploy, run at minimum:

```bash
npm run typecheck
npm run test
npm run build
```

For Android:

```bash
cd apps/android
./gradlew :app:assembleDebug
```

---

## 15. Latest changes and context from 2026-07-05

Code changes already on `main`:

- Mobile `/api/v1` endpoints and native Android app added.
- Android Events tab now includes organized + liked events.
- Feed likes added.
- Top-bar menu added/polished.
- Weekend logic changed to Saturday-Sunday.
- `/fin-de-semana` dark-mode contrast fixed.
- Event creation opened to all logged-in users.
- `/dashboard/*` routes redirect toward `/organizer/*`.
- Mobile menu tile icons normalized.
- City banner uses a location pin and smaller font.
- Google sign-in support added for Android, controlled by `GOOGLE_CLIENT_ID`.

Operational changes done after the latest git commit:

- Vercel project `afisha-website` created/linked.
- Neon Postgres Free created through Vercel Marketplace.
- Vercel env variables added for production/preview.
- Prisma schema pushed to Neon.
- Production DB seeded.
- Admin user `admin@dondego.cl` created/updated.
- Production redeployed successfully.
- `dondego.cl` and `www.dondego.cl` connected to Vercel and verified.
- GoDaddy DNS fixed to Vercel A/CNAME records.
- Production URLs return `200`.

Local working tree note:

- `git status --short` currently shows `M .gitignore`.
- This was created by Vercel CLI adding `.env*` ignore behavior.
- Do not revert it casually; it helps prevent secrets from being committed.

---

## 16. Open tasks / next best steps

Highest priority:

1. Fix Android release API base from `https://dondego.app/` to
   `https://dondego.cl/`, or make it configurable for release builds.
2. Configure Android release signing for Play App Signing.
3. Build release AAB and upload to Google Play internal testing.
4. Add a Privacy Policy page/URL for Play Console.
5. Configure Stripe production/test keys and webhook endpoint if real checkout
   testing is needed on production.

Strong follow-ups:

1. Run full production build/tests after any code change:
   `npm run typecheck && npm run test && npm run build`.
2. Re-run `npx --yes vercel logs ...` after deploys.
3. Consider replacing local upload storage with persistent storage
   (S3/Supabase/Cloudflare R2) because Vercel filesystem is not persistent for
   uploads.
4. Add native camera scanning to Android.
5. Implement native Stripe PaymentSheet only after PaymentIntent endpoints and
   webhook cases are complete.
6. Clean up or document duplicate Preview env variables in Vercel if they cause
   confusion.

---

## 17. Files most likely to matter next

Project docs:

- `README.md`
- `SESSION-HANDOFF.md`
- `docs/HANDOFF-dondego-2026-07-05.md`
- `docs/android-api.md`
- `docs/android-app-plan.md`
- `docs/CONTRACT.md`

Core web/app:

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/layout/Header.tsx`
- `src/components/layout/LanguageMenu.tsx`
- `src/components/events/EventCard.tsx`
- `src/components/events/EventGrid.tsx`

API/business:

- `src/app/api/v1/*`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/scan/route.ts`
- `src/lib/auth.ts`
- `src/lib/authz.ts`
- `src/lib/mobile/events.ts`
- `src/lib/finance/commission.ts`
- `src/lib/finance/ledger.ts`
- `src/lib/payments/finalize.ts`
- `src/lib/payments/stripe.ts`
- `src/lib/promotion/pricing.ts`
- `src/lib/weekend.ts`
- `src/lib/taxonomy.ts`

Database/scraper:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/sourceVenues.ts`
- `prisma/sync-theaters.ts`
- `prisma/sync-commerce.ts`
- `prisma/run-scrape.ts`
- `src/lib/scrapers/index.ts`

Android:

- `apps/android/README.md`
- `apps/android/app/build.gradle.kts`
- `apps/android/app/src/main/java/dondeg/app/ui/DondeGoApp.kt`
- `apps/android/core/network/src/main/java/dondeg/app/core/network/DondeGoApi.kt`
- `apps/android/core/data/src/main/java/dondeg/app/core/data/*`
- `apps/android/feature/discover/src/main/java/dondeg/app/feature/discover/*`
- `apps/android/feature/eventdetail/src/main/java/dondeg/app/feature/eventdetail/EventDetailScreen.kt`
- `apps/android/feature/tickets/src/main/java/dondeg/app/feature/tickets/*`
- `apps/android/feature/scanner/src/main/java/dondeg/app/feature/scanner/ScannerScreen.kt`

---

## 18. Quick start prompt for a new chat

Paste this at the start of a new chat:

```text
We are working on DondeGO in /Users/skif/Documents/GitHub/Afisha-Website.
Read docs/DondeGO-summary-2026-07-05.md first. Current production is
https://dondego.cl on Vercel project afisha-website with Neon Postgres.
Do not commit secrets. The next likely task is Android release/Play internal
testing; first fix release API_BASE_URL from https://dondego.app/ to
https://dondego.cl/ and configure signing.
```
