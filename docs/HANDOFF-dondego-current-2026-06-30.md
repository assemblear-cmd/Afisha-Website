# DondeGO Handoff: Current Stage Prompt

Date: 2026-06-30  
Project path: `/Users/skif/Documents/GitHub/Afisha-Website`  
Branch: `feat/municipal-scraper-i18n`  
Latest commit before the current uncommitted UI pass: `1a41c45 feat(web): expand homepage categories and refresh branding`

## Prompt For A New Chat

Continue work on the DondeGO / Afisha Website project in `/Users/skif/Documents/GitHub/Afisha-Website`.

The project is a Next.js 14 App Router app with Prisma/Postgres. It is an Eventbrite/KudaGo-style Santiago events site. The current focus is mobile UI polish for the homepage and header, while preserving existing desktop behavior.

Start by checking:

```bash
git status --short --branch
npm run typecheck
```

Important: the working tree is intentionally dirty. Do not revert user or parallel-chat changes. The main UI files touched in the latest DondeGO pass are:

- `src/app/page.tsx`
- `src/components/home/Mosaic.tsx`
- `src/components/home/TopCategoryNav.tsx`
- `src/components/home/WeekendFeature.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/LanguageMenu.tsx`

There are also unrelated/parallel edits that should not be mixed into a UI commit unless explicitly requested:

- `src/app/teatros/page.tsx`
- `src/i18n/dictionaries/en.json`
- `src/i18n/dictionaries/es.json`
- `src/lib/format.ts`

The current visual direction:

- Brand identity accent is red, not orange. Tailwind `coral` is red: `#E21B2D`.
- `DondeGO`: `GO` should be red.
- Phrases such as `Where to go in Santiago` / `Qué hacer en Santiago`: `Santiago` should be red.
- Mobile header should be compact and KudaGo-like:
  - left: `DondeGO` logo;
  - then search field with placeholder `where to go`;
  - then language menu as a flag only;
  - then hamburger menu.
- Language flag mapping:
  - Spanish: Chile flag, `🇨🇱`;
  - English: US flag, `🇺🇸`.
- Mobile hamburger menu:
  - light theme: white menu body;
  - dark theme: dark menu body;
  - red city header (`Santiago`);
  - 3-column icon tile grid;
  - first tile spans 2 horizontal slots;
  - remaining tiles stay normal.
- Mobile homepage category strip:
  - only one horizontal scrolling category line at the top;
  - no second mobile category line.
- Homepage event mosaic:
  - first event tile, currently `Alameda Jazz`, spans 2 horizontal slots on mobile;
  - rest of the event cards remain normal 2-column tiles.
- `Where to go this weekend` / `Dónde ir el fin de semana` block:
  - uses `public/images/this-weekend.jpg` in light theme;
  - uses `public/images/this-weekend-dark.png` in dark theme;
  - heading is smaller on mobile;
  - dates of the nearest weekend are displayed under the heading;
  - on mobile, dates show only day numbers with month below the numbers;
  - no search block should appear between this weekend block and Upcoming events.

Before finishing a visual task, use Playwright or the in-app browser to verify at mobile widths around 360px and 390px. `npm run typecheck` has passed after the latest changes. `npm run lint` previously passed with an existing unrelated Next warning about a plain `<img>` in `src/app/events/[id]/page.tsx`.

When committing, stage only the intended files. Avoid accidentally staging the unrelated `teatros`, dictionary, or `format.ts` edits unless the user explicitly asks.

## Architecture Snapshot

### Stack

- Framework: Next.js `14.2.18`, App Router.
- UI: React `18.3.1`, Tailwind CSS.
- Database: Prisma `5.22.0`, PostgreSQL via `DATABASE_URL`.
- Auth: local email/password flow with `bcryptjs` and `jose`.
- Tests/checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run test:e2e`

### Main App Structure

- Homepage: `src/app/page.tsx`
  - `TopCategoryNav`
  - `WhereToGo`
  - `Mosaic`
  - `WeekendFeature`
  - Upcoming events section using `EventGrid`
- Header: `src/components/layout/Header.tsx`
- Language picker: `src/components/layout/LanguageMenu.tsx`
- Homepage localized nav/content: `src/i18n/homeNav.ts`
- Shared dictionaries: `src/i18n/dictionaries/*.json`
- Locale config: `src/i18n/config.ts`
- Locale detection: `src/i18n/getLocale.ts`
- Weekend date helpers: `src/lib/weekend.ts`
- Scraped show feed: `src/lib/data/shows.ts`

### Data Model

Prisma has two related product areas:

- Ticketing MVP:
  - `User`
  - `Event`
  - `TicketType`
  - `Order`
  - `OrderItem`
- Scraped cultural aggregator:
  - `Theater`
  - `Show`

`Event` powers the ticketing/event pages. `Theater` and `Show` power the scraped repertoire/aggregator experience, including homepage mosaic items and `/teatros`.

### Homepage Data Flow

`src/app/page.tsx` currently:

- fetches published upcoming `Event` rows from Prisma for Upcoming events;
- calls `getUpcomingShows()` to fetch active scraped `Show` rows for the homepage mosaic;
- renders:
  - top category nav;
  - city/date "where to go" section;
  - category/event mosaic;
  - weekend feature CTA;
  - upcoming events.

`getUpcomingShows()` in `src/lib/data/shows.ts` returns active shows with no date or future date/end date, sorted by `startsAt`, max 200.

### i18n

- Supported locales: `es`, `en`.
- Default locale: `es`.
- Cookie: `NEXT_LOCALE`.
- Shared dictionary shape is in `src/i18n/config.ts`.
- Homepage-specific strings and category nav live in `src/i18n/homeNav.ts` to avoid colliding with parallel dictionary work.
- `LanguageMenu` writes the locale cookie and calls `router.refresh()`.

### Styling/Theming

- Tailwind theme uses semantic CSS variables:
  - `ink`
  - `body`
  - `muted`
  - `surface`
  - `card`
  - `canvas`
- Dark mode is class-based: `darkMode: 'class'`.
- Brand accent:
  - `coral.DEFAULT = #E21B2D`
  - `coral.dark = #B91527`

## Current Uncommitted UI Changes

These are the intended DondeGO UI changes from the latest session:

- `src/components/layout/Header.tsx`
  - Mobile header now shows logo, search pill, flag language menu, hamburger.
  - Desktop header remains separate.
  - Mobile hamburger menu is full-width under the header.
  - Menu is theme-aware: white in light theme, dark in dark theme.
  - First mobile menu tile spans 2 columns.
- `src/components/layout/LanguageMenu.tsx`
  - Current language button displays only a flag.
  - Dropdown options show flag + language name.
  - `es` maps to Chile, `en` maps to US.
- `src/components/home/TopCategoryNav.tsx`
  - Mobile category navigation is a single horizontal strip.
  - Desktop keeps the two-strip behavior.
- `src/components/home/Mosaic.tsx`
  - First mobile event tile spans 2 columns.
- `src/components/home/WeekendFeature.tsx`
  - Light/dark images for the weekend block.
  - Mobile heading is smaller.
  - Weekend dates are shown with mobile-specific compact styling.
- `src/app/page.tsx`
  - Mobile search block between `WeekendFeature` and Upcoming events was removed.

## Assets

Current weekend image assets:

- `public/images/this-weekend.jpg`
- `public/images/this-weekend-dark.png`
- `public/images/this-weekend.png`

Light theme uses `this-weekend.jpg`. Dark theme uses `this-weekend-dark.png`.

## Verification Notes

Recent checks performed during this UI pass:

```bash
npm run typecheck
```

Result: passes.

Visual checks were done with Playwright screenshots at mobile widths `390px` and `360px` for:

- mobile header with logo/search/flag/menu;
- mobile language dropdown;
- mobile hamburger menu;
- homepage first mosaic tile spanning two columns;
- weekend block followed directly by Upcoming events.

## Suggested Next Tasks

1. Run a final full visual pass on:
   - `/`
   - `/events`
   - `/events?period=weekend`
   - `/teatros`
   in both light and dark themes, mobile and desktop.
2. Run:
   ```bash
   npm run typecheck
   npm run lint
   ```
3. Decide what to commit:
   - UI/mobile files only, or
   - include parallel `teatros`/i18n changes too if the user wants one combined commit.
4. If committing only the UI pass, stage carefully:
   ```bash
   git add src/app/page.tsx \
     src/components/home/Mosaic.tsx \
     src/components/home/TopCategoryNav.tsx \
     src/components/home/WeekendFeature.tsx \
     src/components/layout/Header.tsx \
     src/components/layout/LanguageMenu.tsx
   git commit -m "feat(web): refine mobile DondeGO homepage"
   ```
5. Consider small UX follow-ups:
   - make hamburger menu close after clicking a category;
   - test language dropdown in dark theme;
   - tune the mobile header at widths below 360px;
   - decide whether the desktop language menu should also be flag-only or keep text in dropdown only.

## Local Run Notes

Typical local run:

```bash
npm run dev
```

If the site needs to be opened from another device on the same network, run the dev server on all interfaces, for example:

```bash
npm run dev -- -H 0.0.0.0 -p 3001
```

Then open:

```text
http://<computer-lan-ip>:3001/
```

The user has been testing locally around `http://localhost:3001/`.
