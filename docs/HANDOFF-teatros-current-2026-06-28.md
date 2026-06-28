# Handoff - teatros aggregator current status (2026-06-28)

Prompt for continuing in a new Codex chat with no prior context.

First steps for the next chat:

1. `cd /Users/skif/Documents/GitHub/Afisha-Website`
2. Read this file, then inspect:
   - `prisma/schema.prisma`
   - `prisma/seed.ts`
   - `src/lib/scrapers/index.ts`
   - `src/lib/taxonomy.ts`
   - `src/lib/data/shows.ts`
   - `src/app/api/cron/scrape-theaters/route.ts`
   - `src/app/teatros/page.tsx`
3. Run `git status --short --branch` and `git log --oneline -8`.
4. Do not touch unrelated dirty frontend/i18n files unless the user explicitly asks.

## Repository

- Repo: `/Users/skif/Documents/GitHub/Afisha-Website`
- Branch: `feat/municipal-scraper-i18n`
- Stack: Next.js 14 App Router, React 18, TypeScript, Tailwind, Prisma, PostgreSQL.
- Deployment target noted in older handoffs: Vercel -> `expresscarwash.cl`.
- Nearby but unrelated repo: `/Users/skif/Documents/GitHub/Afisha` (Python backend). Do not use it for `/teatros`.

Recent HEAD:

```text
4190f2c feat(teatros): multi-category taxonomy for events and locations
9ffc0de feat(teatros): venue categories + 3 more venues in seed
e17426d feat(teatros): Teatro UC adapter (The Events Calendar) + drop dead theaters
accecb8 feat(teatros): GAM adapter + Santiago timezone for scraped showtimes
4042db9 docs: session handoff for continuing work in a new chat
```

Current dirty tree at audit time:

```text
 M prisma/seed.ts
 M src/app/teatros/page.tsx
 M src/i18n/dictionaries/en.json
 M src/i18n/dictionaries/es.json
 M src/lib/format.ts
 M src/lib/scrapers/index.ts
?? docs/HANDOFF-teatros-2026-06-28.md
```

Important ownership note:

- `src/app/teatros/page.tsx`, `src/i18n/dictionaries/en.json`, `src/i18n/dictionaries/es.json`, `src/lib/format.ts` are pre-existing frontend/i18n changes from another chat.
- Backend changes from this chat are `src/lib/scrapers/index.ts`, `prisma/seed.ts`, and this handoff file.
- Stage/commit only explicit files. Do not use `git add -A`.

## Build And Verification

Commands run on 2026-06-28:

```text
npx prisma validate
npm run lint
npx tsc --noEmit
npm run build
```

Results:

- Prisma schema valid.
- TypeScript check passed.
- Next lint passed with existing warnings only:
  - `src/app/events/[id]/page.tsx` uses `<img>`.
  - `src/app/page.tsx` uses `<img>`.
  - `src/components/events/EventCard.tsx` uses `<img>`.
- Production build passed:
  - `prisma generate && next build`
  - `/teatros` is server-rendered dynamically.

## Data Model

Prisma uses PostgreSQL:

- `Theater`
  - Source venue / organization.
  - Important fields: `slug`, `name`, `website`, `city`, `categories String[]`, `adapter String?`, `isActive`, `lastScrapedAt`, `lastScrapeOk`, `lastError`.
  - `categories` are location category slugs.
- `Show`
  - Scraped repertoire row.
  - Unique key: `(theaterId, externalId)`.
  - Important fields: `title`, `description`, `startsAt`, `endsAt`, `venue`, raw `category`, controlled `categories String[]`, `priceText`, `priceCents`, `currency`, `sourceUrl`, `imageUrl`, `firstSeenAt`, `lastSeenAt`, `isActive`.
  - `categories` are event category slugs.
- Legacy ticketing MVP tables still exist and are separate:
  - `User`, `Event`, `TicketType`, `Order`, `OrderItem`.

## Taxonomy

Source of truth: `src/lib/taxonomy.ts`.

Event categories (`Show.categories`):

```text
concierto
festival
exposicion
charla
obra-de-teatro
evento-interactivo
otros
```

Location categories (`Theater.categories`):

```text
teatro
sala-de-conciertos
museo
universidad
bar
club
estadio
centro-cultural
restaurante
oficina
edificio
otros
```

`normalizeEventCategories(raw)` maps source labels/title-ish text to one or more event slugs. If an adapter does not set `ScrapedShow.categories`, `runScrape()` derives categories from `ScrapedShow.category`.

Known mapping caveats:

- `Familiar` currently maps to `otros`.
- Municipal category labels like `Grandes estrellas` map to `otros`.
- Dance/ballet/opera/theater collapse to `obra-de-teatro`.
- Music/jazz/concert/orchestra/sonata labels map to `concierto`.

## Scraper Architecture

File: `src/lib/scrapers/index.ts`.

Interface:

```ts
export interface TheaterScraper {
  key: string;
  fetchShows(theater: { website: string }): Promise<ScrapedShow[]>;
}
```

Registry currently contains:

```text
municipal
gam
lascondes
teatrouc
```

`runScrape()`:

- Reads active theaters with non-null `adapter`.
- Looks up `SCRAPERS[theater.adapter]`.
- Runs each theater independently; one failure does not abort the others.
- Upserts by `(theaterId, externalId)`.
- Sets `lastSeenAt`, `isActive=true`, and theater scan state.
- It is still upsert-only: it does not deactivate shows missing from the latest scrape.

Timezone rule:

- Scraped wall-clock dates are anchored to `America/Santiago` with `santiagoTime()`.
- Offset-less ISO strings are interpreted as Santiago wall clock by `isoToInstant()`.
- UI must format via `src/lib/format.ts`, which is pinned to `America/Santiago`.

## Scraper Status - Live Non-Persistent Check

These checks called `fetchShows()` directly and did not write to the DB.

| Adapter | Status | Found | Dated | TBA | Assigned category counts | Notes |
|---|---:|---:|---:|---:|---|---|
| `municipal` | OK | 46 | 27 | 19 | `obra-de-teatro:27`, `concierto:11`, `otros:8` | Still lets through some non-performance/education/admin-like items. |
| `gam` | OK | 26 | 26 | 0 | `obra-de-teatro:19`, `concierto:7` | Crawls discipline listing pages and JSON-LD detail pages. |
| `lascondes` | OK | 7 | 6 | 1 | `obra-de-teatro:3`, `concierto:3`, `evento-interactivo:2`, `festival:1` | New uncommitted adapter. Beethoven cycle is TBA because detailed dates are in an image. |
| `teatrouc` | OK | 2 | 2 | 0 | `obra-de-teatro:2` | The Events Calendar REST feed. |

Live raw category counts:

```text
municipal:
  Ballet y danza: 12
  Grandes estrellas: 3
  Conciertos y recitales: 7
  teatro: 15
  Familiar: 5
  Sonatas Beethoven: 4

gam:
  Teatro: 15
  Danza: 4
  Música: 7

lascondes:
  Teatro: 1
  Concierto - Jazz: 1
  Infantil: 1
  Danza Contemporánea: 1
  Música Clásica: 1
  Musical: 1
  Magia: 1

teatrouc:
  teatro: 2
```

New Las Condes adapter details:

- File: `src/lib/scrapers/index.ts`
- Key: `lascondes`
- Source: `https://www.tmlascondes.cl/estrenos/`
- Strategy:
  - Parse `article.cartelera-item` cards from listing.
  - Use detail pages for exact `Fechas y Horarios`, ticket URL, JSON-LD price, meta image, and description.
  - Dedup by detail page URL.
  - Venue is set to `Teatro Municipal de Las Condes`.
- Returned live titles at audit time:
  - `Nada Era Un Misterio`
  - `Gustavo Casenave`
  - `Pata de Cabra`
  - `Close To Me`
  - `Ciclo Internacional Fundación Beethoven` (TBA)
  - `Otra Otra`
  - `De Una Luz a Otra`
- `prisma/seed.ts` has been changed so `municipal-las-condes` uses `adapter: 'lascondes'`.
- Local DB has not been updated yet; see next section.

## Current Local DB Snapshot

Read-only Prisma snapshot on 2026-06-28:

```text
Users: 3
Events: 19
TicketTypes: 31
Orders: 0
Theaters: 12
Shows: 80
Active Shows: 80
Inactive Shows: 0
```

Theater rows:

| Slug | Adapter in DB | Location categories | Active shows | Last scrape |
|---|---|---|---:|---|
| `centro-cultural-ceina` | null | `teatro`, `centro-cultural` | 0 | never |
| `gam` | `gam` | `centro-cultural`, `teatro` | 29 | OK at `2026-06-27T16:38:28.691Z` |
| `club-subterraneo` | null | `club` | 0 | never |
| `gran-sala-sinfonica-nacional` | null | `sala-de-conciertos`, `centro-cultural` | 0 | never |
| `teatro-azares` | null | `teatro` | 0 | never |
| `teatro-mori` | null | `teatro` | 0 | never |
| `municipal-las-condes` | null | `teatro` | 0 | never |
| `municipal-santiago` | `municipal` | `teatro`, `sala-de-conciertos` | 49 | OK at `2026-06-27T16:38:15.986Z` |
| `teatro-nunoa` | null | `teatro` | 0 | never |
| `teatro-sidarte` | null | `teatro` | 0 | never |
| `teatro-uc` | `teatrouc` | `teatro`, `universidad` | 2 | OK at `2026-06-27T16:38:40.116Z` |
| `teatro-del-puente` | null | `teatro` | 0 | never |

Important DB/code drift:

- Code and seed now know `lascondes`.
- The current local DB still has `municipal-las-condes.adapter = null`, because no reseed or SQL update was run.
- Do not run `npm run db:seed` casually; it deletes `Show`/`Theater` data and recreates it.
- To activate Las Condes without wiping shows, use a targeted DB update, then run the cron endpoint or `runScrape()`.

Location category counts in DB:

```text
teatro: 10
centro-cultural: 3
club: 1
sala-de-conciertos: 2
universidad: 1
```

Active event category counts in DB:

```text
obra-de-teatro: 53
concierto: 19
otros: 8
```

Active shows by theater and event category:

```text
gam:
  concierto: 8
  obra-de-teatro: 21

municipal-santiago:
  obra-de-teatro: 30
  concierto: 11
  otros: 8

teatro-uc:
  obra-de-teatro: 2
```

Raw source category counts in active DB shows:

```text
Música: 8
Teatro: 15
Danza: 4
teatro: 21
Familiar: 5
Ballet y danza: 12
Conciertos y recitales: 7
Grandes estrellas: 3
Ópera: 1
Sonatas Beethoven: 4
```

## Venue Registry And Source Status

| Venue | Slug | Current source status |
|---|---|---|
| Teatro Municipal de Santiago | `municipal-santiago` | Live adapter `municipal`, but quality filters need tightening. |
| Centro Cultural Gabriela Mistral (GAM) | `gam` | Live adapter `gam`. |
| Teatro UC | `teatro-uc` | Live adapter `teatrouc`. |
| Teatro Municipal de Las Condes | `municipal-las-condes` | New live adapter `lascondes` in code; DB adapter still null until targeted update/reseed. |
| Teatro del Puente | `teatro-del-puente` | No adapter yet. |
| Teatro Azares | `teatro-azares` | No adapter yet. |
| Teatro Mori | `teatro-mori` | No adapter yet; older recon said Ticketmaster-only. |
| Teatro Sidarte | `teatro-sidarte` | No adapter yet; older recon said site is union-oriented, not cartelera. |
| Teatro Municipal de Ñuñoa | `teatro-nunoa` | No adapter yet; older recon said WP REST returns 401. |
| Centro Cultural CEINA | `centro-cultural-ceina` | No adapter yet. |
| Gran Sala Sinfónica Nacional | `gran-sala-sinfonica-nacional` | No adapter yet. |
| Club Subterráneo | `club-subterraneo` | No adapter yet; source is Fever venue page. |

## Cron

Endpoint: `src/app/api/cron/scrape-theaters/route.ts`

- Protected by `CRON_SECRET`.
- Vercel Cron uses `Authorization: Bearer ${CRON_SECRET}`.
- Manual local trigger accepts `?secret=...`.
- `vercel.json` schedule in older docs: `0 6 * * *`.

Local manual flow:

```bash
cd /Users/skif/Documents/GitHub/Afisha-Website
docker compose up -d --wait
npx prisma db push
SECRET=$(grep -E '^CRON_SECRET=' .env | cut -d= -f2-)
curl "http://localhost:3000/api/cron/scrape-theaters?secret=$SECRET"
```

Avoid `npm run db:seed` unless you are intentionally resetting scraped `Show` rows.

## Current Risks And Known Issues

1. Las Condes is implemented in code but not activated in current local DB.
2. `runScrape()` is still upsert-only and never sets missing shows to `isActive=false`.
3. Municipal adapter still includes questionable items:
   - examples from live TBA list: `Interpretación Audiovisual 2026`, `Día del Patrimonio 2026`, `Taller de producción de eventos culturales`, `Convocatoria | Director/a de la Escuela de Ballet`, `Taller de adultos 2026`.
4. Municipal has many TBA rows because detail pages do not always expose a parseable upcoming function date.
5. Existing DB includes sample seed shows mixed with real scraped shows:
   - `Don Giovanni - Ópera`
   - `El Lago de los Cisnes - Ballet`
   - `Antígona - Teatro contemporáneo`
   - `Danza Moderna: Cuerpos en Tránsito`
6. `Familiar` maps to `otros`; decide whether it should become `obra-de-teatro` or a new controlled category.
7. Some live scraper checks return `ScrapedShow.categories = null`; this is expected for old adapters because `runScrape()` derives controlled categories from raw `category`.

## Suggested Next Tasks

Recommended immediate backend sequence:

1. Activate Las Condes in local DB without reseed:
   - targeted update `municipal-las-condes.adapter = 'lascondes'`
   - then run cron once
   - verify Las Condes gets 7 active shows
2. Tighten Municipal filtering:
   - exclude auditions, workshops, convocatorias, visitas, patrimonio/admin/education pages unless product wants them
   - consider using title and category denylist plus better date requirements
3. Add deactivation logic:
   - for each theater scrape, collect seen `externalId`
   - set `isActive=false` for active shows of that theater that were not seen
   - be careful with sample shows
4. Decide category behavior for `Familiar`, `Magia`, and `Infantil`.
5. Add/adjust tests for `normalizeEventCategories()` and scraper parsing helpers.
6. Commit backend changes separately from frontend/i18n changes.

Potential follow-up adapters:

1. CEINA
2. Gran Sala Sinfónica Nacional
3. Club Subterráneo / Fever
4. Teatro del Puente
5. Teatro Azares
6. Ñuñoa, Mori, Sidarte only if better structured sources are found

## Commands Used For This Audit

```bash
git status --short --branch
git log --oneline -8
rg -n "export const .*Scraper|SCRAPERS|adapter:|categories:" src/lib/scrapers/index.ts prisma/seed.ts src/lib/taxonomy.ts prisma/schema.prisma src/lib/data/shows.ts
npx prisma validate
npm run lint
npx tsc --noEmit
npm run build
```

Live scraper checks were direct `fetchShows()` calls, not `runScrape()`, so they did not mutate the DB.

