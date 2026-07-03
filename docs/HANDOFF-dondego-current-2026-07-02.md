# DondeGO / Afisha Website Handoff - 2026-07-02

This document is a context package for a new Codex chat. It summarizes the current project state, architecture, implemented decisions, known caveats, and next tasks.

## Prompt For New Chat

Continue work on the DondeGO / Afisha Website project in `/Users/skif/Documents/GitHub/Afisha-Website`.

Read this handoff first. The product is a Santiago events marketplace/listings site built with Next.js App Router, Prisma, and Postgres. Recent work focused on organizer event creation, moderation, event calendars, weekend/date pages, header navigation, poster uploads, and a public/private publication workflow.

Important current product rule: UI text must be only English or Spanish. Do not introduce Russian text into the app UI.

Respect the dirty worktree. There are many existing modified and untracked files from previous work. Do not revert unrelated changes. Use `rg` for search and `apply_patch` for manual edits. Verify with `npm run typecheck` and `npm run lint` after code changes.

## Current Stage

The app is a working MVP with:

- Public event browsing and event detail pages.
- Scraped Santiago shows/venues from theater/event sources.
- Calendar pages:
  - `/calendario`
  - `/calendario/[date]`
  - `/fin-de-semana`
- Organizer account area:
  - `/dashboard` and `/dashboard/events/[id]` are the current simplified "My events" flow.
  - `/organizer/...` is a richer organizer module that also exists and should stay compatible.
- Admin area:
  - `/admin`
  - `/admin/events`
  - `/admin/events/[id]`
  - promo, payout, ticket, scanner/finance screens.
- Event poster upload support through local public uploads.
- Basic ticket creation, checkout, Stripe-related infrastructure, scanning, promotions, and payouts are present in the codebase.

The dev server was last run as:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
```

For phone testing, use the Mac LAN IP instead of `127.0.0.1`. The last known IP during this session was `192.168.1.81`, but it may change.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Prisma 5
- PostgreSQL via `DATABASE_URL`
- Tailwind CSS
- Auth via signed cookie in `src/lib/auth.ts`
- Roles:
  - `visitor`
  - `organizer`
  - `admin`

Useful scripts:

```bash
npm run dev
npm run typecheck
npm run lint
npm run db:generate
npm run db:push
npm run db:seed
```

Demo credentials from seed/local state:

```text
organizer@afisha.test / password123
admin@dondego.test / password123
```

There is also a real organizer account currently seen in DB:

```text
assemblear@gmail.com
```

## Data Model Notes

Main Prisma models:

- `User`
- `Event`
- `TicketType`
- `Order`
- `Ticket`
- `TicketScan`
- `Theater`
- `Show`
- promotion, placement, ledger, payout models

`EventStatus` enum still contains extra legacy/commerce statuses:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
PUBLISHED
REJECTED
CANCELLED
ARCHIVED
COMPLETED
```

Product-facing event statuses are now normalized in `src/lib/event-status.ts`:

- `DRAFT` -> `Created` / `Creado`
- `SUBMITTED`, `IN_REVIEW`, `APPROVED` -> `In review` / `En moderación`
- `PUBLISHED` -> `Published` / `Publicado`
- `REJECTED` -> `Publication rejected` / `Publicación rechazada`
- `ARCHIVED`, `CANCELLED`, `COMPLETED` -> `Archived` / `Archivado`

Important publication criterion:

```ts
event.status === 'PUBLISHED' && event.isPublished === true
```

Anything else must not be visible publicly, must not appear in public search/calendar, and must not be sellable.

## Recent Important Changes

### Organizer Header / Navigation

File:

- `src/components/layout/Header.tsx`

For logged-in organizers, the desktop header now shows only one primary organizer entry:

```text
My events
```

It replaces the old pair:

```text
Dashboard
Create event
```

The mobile menu also exposes `My events` for organizers.

### My Events / Dashboard Flow

Files:

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events/[id]/page.tsx`

`/dashboard` lists organizer events and links each event to:

```text
/dashboard/events/[id]
```

`/dashboard/events/[id]` is the concrete event dashboard/edit page.

Current behavior:

- Shows event title, status, date/time, stats, details, tickets.
- Shows `Publish` button only when event is editable.
- Shows public page link only when event is actually published.
- Removed the extra `Create event` button from the event editing page header.
- Editable statuses are `DRAFT` and `REJECTED`.
- After submit to moderation, editing is locked.

### Event Creation

Files:

- `src/components/events/CreateEventForm.tsx`
- `src/app/api/events/route.ts`

The legacy dashboard creation flow still posts to `/api/events`, but creation no longer publishes immediately.

New behavior:

- Creates `Event.status = DRAFT`
- Creates `Event.isPublished = false`
- Sets `contactName` and `contactEmail` from the logged-in organizer.
- Redirects after creation to `/dashboard/events/[id]`.

### Submit For Moderation

File:

- `src/app/api/organizer/events/[id]/submit/route.ts`

Current behavior:

- Accepts only `DRAFT` or `REJECTED`.
- Requires at least one active/draft ticket type for paid events.
- Sets:

```ts
status: 'IN_REVIEW'
isPublished: false
moderationNotes: null
```

- Creates a moderation log with action `IN_REVIEW`.

### Admin Moderation

Files:

- `src/app/admin/events/page.tsx`
- `src/app/admin/events/[id]/page.tsx`
- `src/components/admin/ModerationActions.tsx`
- `src/app/api/admin/events/[id]/moderate/route.ts`

Admin event filters now map to the five product statuses:

- Created
- In review
- Published
- Rejected
- Archived
- All

Admin actions are simplified:

- `approve` -> `PUBLISHED`, `isPublished=true`
- `reject` -> `REJECTED`, `isPublished=false`, requires notes
- `archive` -> `ARCHIVED`, `isPublished=false`

There is no separate public-facing `Approved` step anymore. `APPROVED` remains only as a legacy alias treated as "In review".

### Status Labels

Files:

- `src/lib/event-status.ts`
- `src/components/organizer/StatusBadge.tsx`

Status badge labels are English/Spanish only. Do not add Russian UI labels.

`StatusBadge` accepts:

```tsx
<StatusBadge status={event.status} locale="en" />
```

Default locale is English. Spanish labels are available through `locale="es"`.

### Editing Lock

Files:

- `src/lib/event-status.ts`
- `src/app/api/organizer/events/[id]/route.ts`
- `src/app/api/organizer/events/[id]/ticket-types/route.ts`
- `src/app/api/organizer/ticket-types/[id]/route.ts`
- `src/components/organizer/TicketTypeManager.tsx`

After submit to moderation:

- Event PATCH is rejected.
- Ticket type creation/update is rejected.
- UI hides/locks editing controls.

Editable only:

```text
DRAFT
REJECTED
```

### Poster Upload

Files:

- `src/app/api/uploads/event-cover/route.ts`
- `src/components/events/CoverImageUploader.tsx`
- `src/lib/cover-image.ts`
- `src/lib/validations.ts`
- `src/lib/organizer/validation.ts`

Organizers can upload a poster image.

Rules:

- Auth required.
- Organizer role required.
- JPG/PNG/WebP/GIF.
- Max 5 MB.
- Saved under `public/uploads/events`.
- `.gitignore` ignores `/public/uploads`.

### Date And Time Inputs

Files:

- `src/lib/date-time-input.ts`
- `src/components/events/CreateEventForm.tsx`
- `src/components/organizer/EventForm.tsx`

Date and time fields are split in UI, then recombined to `YYYY-MM-DDTHH:mm`.

### Public Published Guards

Files:

- `src/app/page.tsx`
- `src/app/events/page.tsx`
- `src/app/events/[id]/page.tsx`
- `src/app/events/[id]/checkout/page.tsx`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/promotions/checkout/route.ts`
- `src/lib/promotion/homepage.ts`
- `src/lib/authz.ts`

Public visibility and sales now require:

```ts
status: 'PUBLISHED'
isPublished: true
```

Draft/review/rejected/archived events should not:

- Open at `/events/[id]`.
- Appear on public event search.
- Appear on public calendars.
- Be purchasable.
- Be promotable.

### Calendar Integration

File:

- `src/lib/data/shows.ts`

Before, calendar pages used only scraped `Show` rows. Published organizer `Event` rows now merge into the calendar/show feed.

Affected pages:

- `/calendario`
- `/calendario/[date]`
- `/fin-de-semana`
- homepage mosaic/upcoming where `getUpcomingShows` is used

Organizer events are mapped to the calendar item shape:

- `sourceUrl` -> `/events/[id]`
- `imageUrl` -> `event.coverImage`
- venue acts like the display source.

Legacy Eventbrite-style categories are mapped to taxonomy categories:

```ts
music -> concierto
nightlife -> fiesta-y-vida-nocturna
performing-visual-arts -> obra-de-teatro
holidays -> festival
lectures -> charla
hobbies -> evento-interactivo
business -> negocios
food-drink -> gastronomia
```

### Fixed Bad DB State

The event:

```text
id: cmr305yur0002jb1uve2a3dr3
title: Lecture
organizer: assemblear@gmail.com
```

was created by the old flow as `PUBLISHED/isPublished=true` without admin approval. It was corrected to:

```text
status: DRAFT
isPublished: false
```

Smoke test confirmed:

- Public `/events/cmr305yur0002jb1uve2a3dr3` returns 404.
- Admin page shows `Created`.
- No Russian status labels remain in app UI for statuses.

## Important Caveats

### Dirty Worktree

The worktree is very dirty and includes many modified/untracked files. This is expected from previous work.

Do not run destructive git commands. Do not revert files unless the user explicitly asks.

Examples of untracked or heavily changed areas:

- `src/app/admin/`
- `src/app/organizer/`
- `src/app/api/admin/`
- `src/app/api/organizer/`
- `src/app/api/uploads/`
- `src/app/calendario/`
- `src/app/fin-de-semana/`
- `src/components/admin/`
- `src/components/organizer/`
- `src/lib/event-status.ts`
- `src/lib/data/shows.ts`
- finance/payment/promotion/tickets helpers and tests

### Lint Warning

`npm run lint` passes but still reports one existing warning:

```text
src/app/events/[id]/page.tsx:55
Warning: Using <img> could result in slower LCP...
```

This warning existed during recent work and has not been treated as a blocker.

### UI Language

Product UI must use English and Spanish only.

Russian text can exist in developer docs or comments only if needed, but do not add Russian visible UI strings.

There are still Russian comments in `src/lib/taxonomy.ts` as internal developer glosses. They are not UI.

## Verification Already Run

Recent successful checks:

```bash
npm run typecheck
npm run lint
```

Smoke scenarios run:

1. Created a temporary event.
2. Verified it starts as `DRAFT/isPublished=false`.
3. Verified public page 404 before approval.
4. Submitted it to moderation.
5. Verified edit API is locked in moderation.
6. Approved as admin.
7. Verified it becomes `PUBLISHED/isPublished=true`.
8. Verified it appears on `/calendario/[date]`.
9. Deleted the temporary test event.

Additional smoke for `Lecture`:

1. Verified DB state is `DRAFT/isPublished=false`.
2. Verified public page 404.
3. Verified admin UI shows `Created`.
4. Verified no Russian `Published`/moderation status text appears.

## Recommended Next Tasks

### 1. Finish Spanish Localization For Organizer/Admin Status UI

The status label helper supports Spanish, but most organizer/admin pages currently render `StatusBadge` without passing locale.

Next step:

- Import `getLocale()` on server pages where appropriate.
- Pass `locale={locale}` to `StatusBadge`.
- Keep admin pages English if that is intended, but public/organizer pages should likely follow the current site locale.

### 2. Unify `/dashboard` And `/organizer`

There are two organizer surfaces:

- `/dashboard` - current simplified My events flow used from header.
- `/organizer` - richer module with tickets, finance, promotion, scanner access.

Decide whether:

- `/dashboard` should stay as the simple "My events" product surface, or
- `/dashboard` should redirect to `/organizer/events`, or
- `/organizer` should be hidden/merged into `/dashboard`.

Avoid duplicating business logic long-term.

### 3. Improve Admin Moderation Notes UX

Current admin rejection requires notes. Approve/archive can include optional notes.

Potential improvements:

- Better labels in English/Spanish.
- Confirmation for archive.
- Separate textarea only when reject is chosen.

### 4. Add Tests For Event Status Workflow

Create focused tests for:

- `/api/events` creates `DRAFT/isPublished=false`.
- submit -> `IN_REVIEW/isPublished=false`.
- PATCH blocked while in review.
- admin approve -> `PUBLISHED/isPublished=true`.
- public APIs/pages hide non-published events.
- calendars include only published organizer events.

### 5. Clean Up Legacy Statuses

The Prisma enum still has `SUBMITTED`, `APPROVED`, `CANCELLED`, `COMPLETED`.

Do not remove casually because finance/payout modules still reference `COMPLETED`, and legacy data may exist.

Possible future approach:

- Keep DB enum broad.
- Keep product mapping in `src/lib/event-status.ts`.
- Add migration only after finance/payout lifecycle is redesigned.

### 6. Public Calendar UX

Now that organizer events appear in calendar feeds, inspect:

- Card labels for organizer events vs scraped shows.
- Whether `/calendario` should show public organizer events and scraped shows mixed, or visually differentiated.
- Whether category mapping is good enough for old Eventbrite-style categories.

### 7. Replace `<img>` Warning

Optional but tidy:

- Replace the public event page `<img>` with `next/image`, or keep an eslint disable if remote/local image config is not ready.

### 8. Deployment / Network Testing

For phone testing:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
ipconfig getifaddr en0
```

Open from phone:

```text
http://<mac-lan-ip>:3000/
```

Phone and Mac must be on the same Wi-Fi network.

## High-Signal Files

Status workflow:

- `src/lib/event-status.ts`
- `src/components/organizer/StatusBadge.tsx`
- `src/components/organizer/SubmitEventButton.tsx`
- `src/app/api/events/route.ts`
- `src/app/api/organizer/events/[id]/submit/route.ts`
- `src/app/api/admin/events/[id]/moderate/route.ts`

Organizer dashboard:

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events/[id]/page.tsx`
- `src/components/organizer/EventForm.tsx`
- `src/components/organizer/TicketTypeManager.tsx`

Admin:

- `src/app/admin/page.tsx`
- `src/app/admin/events/page.tsx`
- `src/app/admin/events/[id]/page.tsx`
- `src/components/admin/ModerationActions.tsx`

Public visibility:

- `src/app/page.tsx`
- `src/app/events/page.tsx`
- `src/app/events/[id]/page.tsx`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/checkout/route.ts`

Calendar/show feed:

- `src/lib/data/shows.ts`
- `src/app/calendario/page.tsx`
- `src/app/calendario/[date]/page.tsx`
- `src/app/fin-de-semana/page.tsx`
- `src/components/shows/ShowTileGrid.tsx`

Uploads:

- `src/app/api/uploads/event-cover/route.ts`
- `src/components/events/CoverImageUploader.tsx`
- `src/lib/cover-image.ts`

Header:

- `src/components/layout/Header.tsx`
- `src/components/layout/HeaderCalendarPicker.tsx`

## Suggested First Actions In New Chat

1. Run:

```bash
pwd
git status --short
npm run typecheck
```

2. Read:

```bash
sed -n '1,220p' src/lib/event-status.ts
sed -n '1,260p' 'src/app/dashboard/events/[id]/page.tsx'
sed -n '1,220p' 'src/app/api/admin/events/[id]/moderate/route.ts'
```

3. If continuing status work, verify the `Lecture` event:

```bash
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.event
  .findUnique({
    where: { id: 'cmr305yur0002jb1uve2a3dr3' },
    select: { id: true, title: true, status: true, isPublished: true },
  })
  .then(console.log)
  .finally(() => prisma.$disconnect());
NODE
```

Expected:

```text
status: DRAFT
isPublished: false
```
