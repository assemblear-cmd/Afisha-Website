# DondeGO Handoff: Santiago Sources, Categories, Venues

Date: 2026-06-30  
Project path: `/Users/skif/Documents/GitHub/Afisha-Website`  
Current focus: expanding the Santiago aggregator database with event/location categories, venue source URLs, and future scraper inputs from Fever, Eventbrite, and Bandsintown.

## Prompt For A New Chat

Continue work on the DondeGO / Afisha Website project in:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
```

Start by reading this document, then run:

```bash
git status --short
npm run typecheck
```

Important: the working tree is intentionally dirty and shared with parallel work. Do not revert or overwrite user/parallel-chat changes. In particular, unrelated or parallel edits exist in UI/i18n files such as:

- `src/app/page.tsx`
- `src/app/teatros/page.tsx`
- `src/components/home/*`
- `src/components/layout/*`
- `src/i18n/dictionaries/en.json`
- `src/i18n/dictionaries/es.json`
- `src/lib/format.ts`

The source/category task touched these files:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/taxonomy.ts`
- `src/lib/scrapers/index.ts`
- `src/lib/data/shows.ts`
- `src/components/home/Mosaic.tsx`
- `src/i18n/homeNav.ts`
- `tests/unit/taxonomy.test.ts`

If committing only this source/category work, stage carefully and inspect `src/components/home/Mosaic.tsx`, because that file also contains pre-existing UI work from the current dirty tree.

## Current Stage

The user asked to scan event and venue sources in Santiago:

1. `https://feverup.com/en/santiago`
2. `https://www.eventbrite.com/d/chile--santiago/events/`
3. `https://www.bandsintown.com/c/santiago-chile`

Goal: add matching event categories and venue/location categories to the database, and add primary event sources to the venue database for later scraping/parsing into DondeGO.

Current status:

- Code/schema/seed changes are implemented.
- TypeScript and tests pass.
- Local live Postgres was not updated because Docker Desktop storage is failing with `input/output error`.
- No commit was made.

## Architecture Snapshot

Stack:

- Next.js 14 App Router
- React 18
- Tailwind CSS
- Prisma 5
- PostgreSQL through `DATABASE_URL`

Data areas:

- Ticketing MVP: `User`, `Event`, `TicketType`, `Order`, `OrderItem`
- Scraped aggregator: `Theater`, `Show`

Aggregator concepts:

- `Theater` is a venue/source row. It has `slug`, `name`, `website`, `city`, `categories`, optional `adapter`, scan state, and now `eventSources`.
- `Show` is a scraped event row. It belongs to a `Theater`, has `externalId`, `title`, date fields, raw `category`, controlled `categories`, price, `sourceUrl`, `imageUrl`, and scan state.
- `src/lib/taxonomy.ts` is the canonical source for aggregator slugs.
- `src/lib/categories.ts` is the separate Eventbrite-style MVP category list. Do not mix it with aggregator taxonomy.

## Implemented Changes

### Prisma

`Theater` now has:

```prisma
eventSources String[] @default([])
```

Purpose: keep one or more event listing/detail/source URLs per venue. `website` can remain the official venue page, while `eventSources` can point to Fever/Eventbrite/Bandsintown pages that actually list events.

### Taxonomy

Expanded `EVENT_CATEGORIES` beyond the original 7:

- `concierto`
- `festival`
- `exposicion`
- `charla`
- `obra-de-teatro`
- `evento-interactivo`
- `comedia`
- `fiesta-y-vida-nocturna`
- `networking`
- `negocios`
- `tecnologia`
- `gastronomia`
- `curso-taller`
- `salud-y-bienestar`
- `deportes`
- `familia`
- `cine`
- `beneficencia`
- `religion-espiritualidad`
- `otros`

Expanded `LOCATION_CATEGORIES` with venue types found in the new sources:

- `arena`
- `sala-de-eventos`
- `centro-de-convenciones`
- `hotel`
- `parque`
- `centro-comercial`
- `colegio`

Kept `FEATURED_EVENT_CATEGORIES` as the original seven category slots so the homepage mosaic does not expand just because backend taxonomy grew.

### Seed Data

`prisma/seed.ts` now stores `eventSources` for existing scraper venues:

- Teatro Municipal de Santiago
- Teatro Municipal de Las Condes
- GAM
- Teatro UC

It also adds or enriches venues discovered from Fever:

- Club Subterráneo
- Parque Quinta Normal
- Centro Costanera
- Parque Metropolitano de Santiago
- Cenco Florida
- Club de la Unión de Santiago
- Polo Apoquindo
- Centro Cultural CEINA
- Teatro Mori

From Eventbrite:

- BAR EL BAJO
- Centro Cultural Carabineros de Chile
- Santiago Marriott Hotel
- Segreta Pizzeria
- Colegio Pedro de Valdivia - Peñalolén
- The Ritz-Carlton, Santiago
- Centro de Posgrado Universidad de Santiago

From Bandsintown city/concert coverage:

- Movistar Arena
- Teatro Caupolicán
- Teatro Coliseo
- Blondie
- Bar de René
- Espacio Riesco
- Estadio Nacional

### Data Layer

`src/lib/data/shows.ts` now selects `eventSources` for theaters in:

- `getUpcomingShows()`
- `getTheatersWithShows()`

### Scraper Interface

`TheaterScraper.fetchShows()` now accepts:

```ts
{ website: string; eventSources?: string[] }
```

Existing adapters still work because `eventSources` is optional.

### i18n

`src/i18n/homeNav.ts` has ES/EN labels for the new event category slugs.

### Tests

`tests/unit/taxonomy.test.ts` now covers new source mappings:

- Eventbrite tech/business/networking labels
- Fever immersive/comedy labels
- food, wellness, family, charity labels

## Source Findings

### Fever

Useful pages:

- `https://feverup.com/en/santiago`
- `https://feverup.com/en/santiago/top-10`
- `https://feverup.com/en/santiago/venue`
- `https://feverup.com/en/santiago/venue/club-subterraneo`

Fever page data exposed venue/event information in rendered HTML and structured data. The top-10 page showed plans and venues such as:

- Harry Potter: A Forbidden Forest Experience, Parque Quinta Normal
- Dopamine Land, Centro Costanera
- Light Cycles, Parque Metropolitano de Santiago
- Van Gogh Live, Cenco Florida
- VIVA FRIDA KAHLO, Club de la Unión de Santiago
- Latam Bajo Cero, Polo Apoquindo
- Candlelight and Ballet of Lights, Centro Cultural CEINA
- The Jury Experience, Teatro Mori Parque Arauco

The Club Subterráneo venue page includes JSON-LD with venue address and events such as The Jazz Room.

### Eventbrite

Useful page:

- `https://www.eventbrite.com/d/chile--santiago/events/`

The page returns `window.__SERVER_DATA__` with `destination_event` objects. It includes event tags such as:

- `EventbriteCategory`
- `EventbriteSubCategory`
- `EventbriteFormat`

Examples found on 2026-06-30:

- Santiago Tech Mixer and Social, BAR EL BAJO
- Santiago Social and Language Exchange, BAR EL BAJO
- Concierto El piano y la pasión, Centro Cultural Carabineros de Chile
- Data Center & AI Infrastructure LATAM 2026, Santiago Marriott Hotel
- LSHTM Alumni Santiago Meetup, Segreta Pizzeria
- Fundación Santo Tomás de Aquino, Colegio Pedro de Valdivia - Peñalolén
- The MBA Tour Santiago, The Ritz-Carlton, Santiago
- Certificación LEGO Serious Play, Centro de Posgrado Universidad de Santiago

Eventbrite can probably support a future adapter without fragile card scraping by parsing `window.__SERVER_DATA__`.

### Bandsintown

Useful page:

- `https://www.bandsintown.com/c/santiago-chile`

Direct local `curl` was blocked by Cloudflare with HTTP 403. Use browser/session-based inspection or a supported Bandsintown API if available. Seed currently records the city source URL for known Santiago concert venues that Bandsintown commonly covers.

Likely future venue/event category coverage:

- concerts
- festivals
- arenas
- stadiums
- clubs
- bars
- concert halls

## Verification Already Run

These passed:

```bash
npm run db:generate
npm run test -- tests/unit/taxonomy.test.ts
npm run typecheck
npx prisma validate
npm run lint
git diff --check
```

`npm run lint` passed with the existing warning about a plain `<img>` in `src/app/events/[id]/page.tsx`.

## Local DB Blocker

Attempted:

```bash
npx prisma db push
docker exec afisha-postgres pg_isready -U afisha -d afisha
docker exec afisha-postgres psql -U afisha -d afisha -c 'select now(), count(*) from "Theater";'
docker compose up -d --wait db
docker restart afisha-postgres
docker logs --tail 80 afisha-postgres
```

All DB/container operations failed because Docker Desktop storage returned errors like:

```text
input/output error
Cannot restart container afisha-postgres
unable to get image 'postgres:16-alpine'
```

Do not run destructive DB commands to work around this. The local Docker Desktop storage layer needs to be restarted or repaired first.

Once Docker/Postgres works, run:

```bash
npx prisma db push
```

Then either:

- create a targeted non-destructive Prisma upsert script for the `Theater` rows from `prisma/seed.ts`, or
- run `npm run db:seed` only if it is acceptable to delete and recreate `Show` data.

The safer next step is a non-destructive upsert script.

## Suggested Next Tasks

1. Restore local Docker/Postgres, then run `npx prisma db push`.
2. Write a non-destructive `Theater` upsert script that syncs `slug`, `name`, `website`, `eventSources`, `adapter`, `categories`, and `city` from the seed list without deleting existing `Show` rows.
3. Run that script and verify counts/categories with Prisma or SQL.
4. Build a first Eventbrite adapter:
   - fetch `https://www.eventbrite.com/d/chile--santiago/events/`
   - parse `window.__SERVER_DATA__`
   - filter offline Chile/Santiago events
   - map venue and tags to `ScrapedShow`
   - use `normalizeEventCategories()` over category, subcategory, format, title, summary
5. Build a Fever adapter:
   - parse city/top-10/venue pages
   - prefer JSON-LD or embedded hydration data
   - map plan locations to `Theater`
6. Investigate Bandsintown through browser-accessible data or an official/supported API instead of fighting Cloudflare.
7. Add source-specific tests for Eventbrite/Fever parsing fixtures.
8. If committing, stage only intended source/category files and avoid unrelated dirty UI/i18n files unless the user asks for a combined commit.

## Commit Hygiene

Potential source/category commit files:

```bash
git add prisma/schema.prisma \
  prisma/seed.ts \
  src/lib/taxonomy.ts \
  src/lib/scrapers/index.ts \
  src/lib/data/shows.ts \
  src/i18n/homeNav.ts \
  tests/unit/taxonomy.test.ts \
  docs/HANDOFF-dondego-sources-current-2026-06-30.md
```

Only add `src/components/home/Mosaic.tsx` after inspecting the diff, because that file also contains parallel UI changes.

Suggested commit message:

```bash
git commit -m "feat(data): add Santiago source venues and taxonomy"
```

