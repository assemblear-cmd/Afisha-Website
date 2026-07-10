# DondeGO — актуальный summary и prompt для продолжения

Дата обновления: 2026-07-10  
Репозиторий: `/Users/skif/Documents/GitHub/Afisha-Website`  
Ветка на момент подготовки: `main`  
HEAD на момент подготовки: `70c7dac`  
Production: `https://dondego.cl`  

Этот документ нужен для нового чата без контекста. Его можно вставить первым
сообщением перед продолжением разработки.

## Prompt для нового чата

```text
Продолжай работу над DondeGO в репозитории:
/Users/skif/Documents/GitHub/Afisha-Website

Не начинай проект заново. Сначала прочитай docs/DondeGO-summary-2026-07-10.md,
затем проверь git status --short, текущий diff и релевантные файлы.

DondeGO — афиша мероприятий Сантьяго + self-service платформа для организаторов.
Стек: Next.js 14 App Router, TypeScript, Prisma/Postgres, Stripe, Vercel, Neon,
native Android на Kotlin/Jetpack Compose.

Текущая стадия: активно дорабатывается Android-приложение и мобильная главная.
Последний завершенный шаг: вместо блока "Upcoming events / Fresh picks sorted by
date" на главной Android вставлен горизонтальный блок категорий с логотипами
ивентов на прозрачном фоне страницы. APK был собран, установлен на физический
Samsung через USB и визуально проверен скриншотом.

Важные правила:
- Не откатывай чужие/предыдущие незакоммиченные изменения.
- Используй apply_patch для ручных правок файлов.
- Секреты не писать в репозиторий.
- Для Android на телефоне используй ADB:
  /Users/skif/Library/Android/sdk/platform-tools/adb
- Debug APK для телефона собирается так:
  cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
  ./gradlew :app:assembleDebug -PdondegoApiBase=http://127.0.0.1:3000/
- Для доступа телефона к локальному Next server:
  adb reverse tcp:3000 tcp:3000
- Установка:
  adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
- Язык общения с пользователем: русский, кратко и по делу.
```

## Product Summary

DondeGO — продукт для поиска и публикации мероприятий в Сантьяго, Чили.

Основные линии:

- Афиша/агрегатор: scraped-внешние мероприятия из театров, культурных площадок,
  Eventbrite-подобных источников и календарей.
- Нативные мероприятия DondeGO: зарегистрированный пользователь создает событие,
  продает билеты или принимает донаты, управляет событием из dashboard.
- Мобильное приложение: лента событий, поиск, категории, лайки, вкладка Events
  с liked/my events, авторизация, tickets/QR, scanner.
- Instagram growth loop: отдельный documented process для публикации афиш в
  Stories через физический Android-телефон.

Основная локаль продукта: `es`. Поддерживается `en`.  
Валюта по умолчанию: `CLP`.  
Город фокуса: Santiago, Chile.

## Business Rules

- Любой зарегистрированный пользователь может создать мероприятие.
- Organizer — не отдельная роль для доступа к созданию события; organizer tools
  появляются вокруг конкретного созданного события.
- DondeGO берет комиссию только с нативных DondeGO-events, не со scraped events.
- Текущая комиссия платформы: 5%.
- Источник правды по оплатам: Stripe webhook. Client success redirect и Android
  не должны самостоятельно помечать order как paid.
- Прошедшие внешние мероприятия удаляются из календаря.
- Прошедшие organizer events не удаляются: они переходят в архив/`COMPLETED`,
  чтобы сохранить dashboard, attendance, donations/revenue, ledger, payouts,
  scanner history и афишу.

## Production и Deploy

Production URLs:

- `https://dondego.cl`
- `https://www.dondego.cl`
- Vercel fallback: `https://afisha-website.vercel.app`

Hosting:

- Vercel project: `afisha-website`
- Owner/team: `assemblear-4979s-projects`
- Framework preset: Next.js
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: Next.js default

Database:

- Production DB: Neon Postgres Free через Vercel Marketplace.
- Prisma schema уже применялась через `npx prisma db push`.
- Seed уже выполнялся на production DB.

Production env vars живут в Vercel, не в git:

- `DATABASE_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- Stripe env vars
- Google/mobile auth env vars where applicable

## DNS

Домен куплен на GoDaddy: `dondego.cl`.

В GoDaddy должны оставаться служебные `NS`, `SOA`, `_domainconnect`, `_dmarc`.
Для Vercel ожидается apex A-record и `www` CNAME. Уже использовалась запись:

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `@` | `216.198.79.1` | Vercel apex |
| CNAME | `www` | `dondego.cl.` или Vercel target | www-domain |

Перед изменениями DNS лучше свериться с Vercel Domains screen, потому что target
может зависеть от конкретной привязки проекта.

## Web Architecture

```text
Browser / Android app
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
PostgreSQL / Neon

External integrations:
- Stripe Checkout and webhooks
- Google OAuth ID token verification for mobile sign-in
- External event sources through scrapers
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

Important directories:

- `src/app` — App Router pages and API route handlers.
- `src/components` — UI, layout, events, organizer, admin components.
- `src/lib` — auth, finance, event cleanup, scrapers, payments, formatting,
  category taxonomy, mobile mappers.
- `prisma/schema.prisma` — DB schema.
- `prisma/run-scrape.ts` — manual scraper runner.
- `prisma/cleanup-events.ts` — cleanup/archive runner.
- `apps/android` — native Android client.
- `docs` — handoff summaries, Android API notes, agents.

## API Surface для Android

Android использует `/api/v1/*` и часть legacy endpoints:

- `GET /api/v1/feed`
- `GET /api/v1/events`
- `GET /api/v1/events/native/{id}`
- `GET /api/v1/events/scraped/{id}`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/google`
- `GET /api/auth/me`
- `GET /api/v1/me/events`
- `GET /api/v1/me/likes`
- `POST /api/v1/me/likes`
- `DELETE /api/v1/me/likes`
- `GET /api/v1/me/tickets`
- `GET /api/v1/me/tickets/{id}`
- `GET /api/v1/scanner/events`
- `POST /api/scan`

Source of truth:

- Android API contract: `docs/android-api.md`
- Android implementation: `apps/android/core/network/src/main/java/dondeg/app/core/network/DondeGoApi.kt`

## Android Architecture

Package/applicationId: `dondeg.app`  
Version now: `0.1.0`, `versionCode=1`  
Current physical test phone: Samsung `SM-S918U1`, serial `R3CWA0H83HM`

Module layout:

```text
apps/android/
├── app                     # single Activity shell, NavHost, DI container
├── core/common             # ApiResult
├── core/model              # domain models
├── core/network            # Retrofit + serialization
├── core/data               # repositories + encrypted session storage
├── core/designsystem       # Material 3 theme, labels, formatters
├── feature/discover        # home feed, search, categories, Events tab
├── feature/eventdetail     # native/scraped detail
├── feature/auth            # login/register
├── feature/tickets         # tickets + QR
├── feature/scanner         # scanner/token flow
├── feature/organizer       # web dashboard handoff
├── feature/admin           # admin handoff
└── feature/checkout        # reserved/native checkout handoff
```

Build details:

- compileSdk `37`
- targetSdk `36`
- minSdk `26`
- JDK 17
- Kotlin/Compose via Gradle version catalog
- Debug API base default: `http://10.0.2.2:3000/`
- Physical-phone debug build override:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
./gradlew :app:assembleDebug -PdondegoApiBase=http://127.0.0.1:3000/
```

Install/update on connected phone:

```bash
ADB=/Users/skif/Library/Android/sdk/platform-tools/adb
cd /Users/skif/Documents/GitHub/Afisha-Website

$ADB devices -l
$ADB reverse tcp:3000 tcp:3000
$ADB install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
$ADB shell am force-stop dondeg.app
$ADB shell am start -n dondeg.app/.MainActivity
```

Check install:

```bash
$ADB shell dumpsys package dondeg.app | rg 'versionName|versionCode|firstInstallTime|lastUpdateTime'
$ADB reverse --list
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/events
```

Last verified install in this session:

- `lastUpdateTime=2026-07-10 05:41:27`
- `UsbFfs tcp:3000 tcp:3000`
- local API `/api/v1/events` returned `200`

If `monkey` does not bring DondeGO to foreground, use explicit component start:

```bash
$ADB shell am start -n dondeg.app/.MainActivity
```

## Current UI/Product State

### Web

Recent web decisions:

- Light theme should be softer and slightly beige, easier on eyes.
- Global Organizer panel was removed.
- `/organizer` should redirect to `/organizer/events`.
- The visible organizer area is now `My events`.
- Per-event dashboard is where Scanner, Payouts/Finance, ticket management,
  attendance, donations/revenue, poster and archive live.

Changed web files in current dirty worktree:

- `src/app/globals.css`
- `src/app/organizer/layout.tsx`
- `src/app/organizer/page.tsx`
- `src/app/organizer/events/page.tsx`

### Android Latest Changes

The Android app has been actively redesigned on 2026-07-10.

Current mobile home/header decisions:

- `DondeGO` text logo was replaced with compact logo.
- Current logo spec: burgundy background with white `D`.
- Launcher icon also uses burgundy background with white `D`.
- `Santiago` location chip was removed.
- `Login` was removed from top bar and stays inside the burger menu.
- Search is in the top bar to the right of the logo.
- Separate filter button right of search was removed.
- Search placeholder shortened to `Search events` / `Buscar eventos`.
- Search field height/line-height was fixed so text is visible.
- Burger menu is premium/minimal:
  - sign in/sign out at top;
  - language via flags;
  - no home/events/my tickets/organizer/scanner category clutter.
- Bottom nav now shows only `Home` and `Events` for normal users. Admin can see
  Admin if role is admin. Organizer/Scanner removed from bottom nav.
- `Popular now` text and body copy were removed.
- Top visible feed prioritizes unique event categories.
- The old `Upcoming events` / `Fresh picks sorted by date` text block was
  replaced by a horizontal logo category rail.
- Category logos are generated in Compose Canvas, with transparent background so
  the page background remains continuous.
- Category logos are clickable and call `onCategory`; tapping the selected
  category clears the filter.

Changed Android files in current dirty worktree:

- `apps/android/app/src/main/java/dondeg/app/ui/DondeGoApp.kt`
- `apps/android/app/src/main/res/drawable/ic_launcher.xml`
- `apps/android/feature/discover/src/main/java/dondeg/app/feature/discover/DiscoverScreen.kt`
- `apps/android/feature/discover/src/main/res/values/strings.xml`
- `apps/android/feature/discover/src/main/res/values-es/strings.xml`

Visual verification:

- ADB screenshot after latest category-logo update:
  `/tmp/dondego-category-logos-check-3.png`
- It showed DondeGO foreground with:
  - burgundy/white D logo;
  - readable search field;
  - hero rail;
  - category-logo rail (`Theater`, `Other`, `Concert`, `Talk`);
  - event grid below.

## Current Git State

At the time this summary was written, the worktree was intentionally dirty.
Do not revert these files unless the user asks.

Known modified files:

```text
apps/android/app/src/main/java/dondeg/app/ui/DondeGoApp.kt
apps/android/app/src/main/res/drawable/ic_launcher.xml
apps/android/feature/discover/src/main/java/dondeg/app/feature/discover/DiscoverScreen.kt
apps/android/feature/discover/src/main/res/values-es/strings.xml
apps/android/feature/discover/src/main/res/values/strings.xml
src/app/globals.css
src/app/organizer/events/page.tsx
src/app/organizer/layout.tsx
src/app/organizer/page.tsx
```

Known untracked files/directories:

```text
docs/DondeGO-summary-2026-07-10.md
docs/agents/
```

The user previously asked to commit changes to main, but after that more Android
changes were made. Before committing, inspect the full diff and confirm scope.

## Scraper, Calendar, Cleanup

Package scripts:

```bash
npm run db:scrape
npm run db:cleanup-events
npm run typecheck
npm run build
npm run test
npm run dev
```

Vercel cron config in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/scrape-theaters", "schedule": "0 6 * * *" },
    { "path": "/api/cron/cleanup-events", "schedule": "30 6 * * *" }
  ]
}
```

Cron endpoints:

- `GET /api/cron/scrape-theaters`
- `GET /api/cron/cleanup-events`

Both are protected by cron auth. Production should call them with:

```text
Authorization: Bearer ${CRON_SECRET}
```

Cleanup behavior:

- Past external `Show` rows are deleted.
- Past organizer `Event` rows are not deleted; published/approved rows become
  `COMPLETED`, `isPublished=false`, and receive `completedAt`.
- Dry run is available on cleanup endpoint with `?dryRun=1`.

## Instagram Story Agent

There is a documented workflow for publishing DondeGO event posters to Instagram
Stories through the connected Android phone:

- `docs/agents/instagram-story-publisher-agent.md`

Core rules:

- Use physical Android phone over ADB, not Instagram web.
- Publish one event poster as a Story.
- No visible URL in the creative.
- Event URL goes only into Instagram native Link sticker.
- No top `DondeGO` / `Agenda Santiago` branding unless explicitly requested.
- Put date/event/venue text directly over the poster, without frames/cards.
- Verify story editor before publishing and verify published Story after.

Known phone/Instagram environment:

```text
ADB: /Users/skif/Library/Android/sdk/platform-tools/adb
Phone serial: R3CWA0H83HM
Model: SM-S918U1
Instagram package: com.instagram.android
```

## Verification Checklist

Before continuing:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
git status --short
git diff --stat
```

For web:

```bash
npm run typecheck
npm run build
npm run dev
```

Manual web checks:

- `https://dondego.cl` / local home loads.
- Light theme is warm/soft, not harsh white.
- Dark theme still reads correctly.
- `/organizer` redirects to `/organizer/events`.
- `/organizer/events` shows `My events` and no global Organizer tab panel.
- Creating an event still lands on `/organizer/events/[id]`.
- Event dashboard still exposes scanner/finance/ticket/archive functionality.

For Android:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website/apps/android
./gradlew :app:assembleDebug -PdondegoApiBase=http://127.0.0.1:3000/
```

Then install and launch:

```bash
ADB=/Users/skif/Library/Android/sdk/platform-tools/adb
cd /Users/skif/Documents/GitHub/Afisha-Website
$ADB reverse tcp:3000 tcp:3000
$ADB install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
$ADB shell am start -n dondeg.app/.MainActivity
```

Visual Android checks:

- Logo is burgundy with white `D`.
- Search text is readable and not clipped.
- No top `Santiago` and no top `Login`.
- Burger menu has account action and language flags only.
- Bottom nav has Home/Events, no Organizer/Scanner for normal users.
- Main page has category-logo rail instead of `Upcoming events` copy.
- Category logo tap filters; tapping selected category clears filter.
- Event cards still open detail pages.

## Recommended Next Tasks

1. QA the new Android category-logo rail on real phone:
   - Spanish locale labels;
   - long labels truncation;
   - selected state visibility;
   - light/dark theme contrast.
2. Decide if category logos should remain Canvas-generated or be replaced with
   generated bitmap/vector assets for a more premium brand look.
3. Inspect full dirty diff and commit the current web + Android stage when user
   confirms scope.
4. Run `npm run typecheck`, `npm run build`, and Android `assembleDebug` before
   production deploy or commit.
5. Deploy updated web to Vercel if web changes are ready.
6. If Android is intended for release, build release with production API base
   `https://dondego.cl/` and configure signing.
7. Run scraper for the next-month calendar and inspect duplicates, old dates,
   missing images and category mapping.
8. Confirm Vercel cron runs scraper and cleanup daily with valid `CRON_SECRET`.
9. Check all visible finance copy for the 5% commission rule.
10. Continue improving the Instagram Story agent after each successful posting.

