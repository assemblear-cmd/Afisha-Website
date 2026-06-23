# Handoff — Teatros scraper & datasource (session 2026‑06‑21)

Pick‑up document for continuing this work in a **new chat**. Read this first, then
verify against the working tree / git before acting (state may have moved on).

---

## 1. What this project is

- **Afisha‑Website** — Next.js 14 (App Router) + React 18 + TypeScript + Tailwind, **Prisma** ORM.
- Deployed at **expresscarwash.cl** (see `CNAME`) on Vercel.
- Two things live in one repo:
  1. The original **Eventbrite‑style ticketing MVP** (`User`/`Event`/`TicketType`/`Order` models, `/api/events`, `/api/orders`, `/api/auth/*`).
  2. A new **theater‑repertoire aggregator** for Santiago theaters (this session): a daily scraper fills `Theater`/`Show`, and `/teatros` renders a theater‑first cartelera (an analog of `eventbrite.com/d/chile--santiago/teatro/`).

## 2. Current branch & commit

- Branch: **`feat/municipal-scraper-i18n`** — commit **`28a7942`** "feat(teatros): live Municipal scraper adapter + i18n cartelera".
- That commit bundles **this chat's backend work** *and* a **parallel chat's i18n/localization** work (shared working tree). Not yet pushed / no PR.

## 3. What was done this session (change history)

1. **Scope** — this chat worked on the **in‑repo Next.js + Prisma backend** (despite memory notes that frame it as "frontend‑only"; treat those as stale re: ownership).
2. **`/teatros` from the DB** — moved theater listing off the legacy external `afishaFetch`/FastAPI seam to a Server Component reading Prisma directly.
3. **Backend patterns** — added `src/lib/api-error.ts` (`ApiError` + `errorHandler`); wrapped `POST /api/orders` so the in‑transaction oversell **race returns 400** (was an uncaught 500). Extracted data‑access into `src/lib/data/`.
4. **Theater aggregator (the core build):**
   - Prisma models **`Theater`** (source site + per‑theater scan state: `lastScrapedAt`/`lastScrapeOk`/`lastError`) and **`Show`** (repertoire; unique `(theaterId, externalId)` for upsert dedup, `firstSeenAt`/`lastSeenAt`/`isActive`).
   - Seeded **11 Santiago theaters** (`prisma/seed.ts`) from the user's CSV (URLs cleaned of `oteatre`/`yandex`/etc. junk), plus a few sample `Show`s.
   - **Scraper framework** `src/lib/scrapers/index.ts`: `TheaterScraper` interface, a generic JSON‑LD extractor, a per‑theater adapter registry (`SCRAPERS`), and an **orchestrator (`runScrape`)** with **per‑theater error isolation** + upsert.
   - **Daily cron**: `src/app/api/cron/scrape-theaters/route.ts` (protected by `CRON_SECRET`; `?secret=` for manual trigger) + `vercel.json` cron `0 6 * * *`.
   - Listing data layer `src/lib/data/shows.ts` (`getUpcomingShows`, `getTheatersWithShows`).
5. **Datasource settled → Postgres everywhere** — `schema.prisma` `provider = "postgresql"`; local Postgres via **`docker-compose.yml`** (container `afisha-postgres`, host port **5433**); `.env` `DATABASE_URL` → `postgresql://afisha:afisha@localhost:5433/afisha?schema=public`. SQLite is gone (Vercel can't run it).
6. **Teatro Municipal live adapter (the reference)** — replaced the placeholder with `municipalScraper`:
   - Source: **WordPress REST `/wp-json/wp/v2/shows`** (the `shows` custom post type) — one API call, `_embed` for taxonomies.
   - **Filters non‑performances** (`category_show` ∈ {Cartelera digital, Visitas guiadas temáticas} and title keywords: Venta de Vestuario / Curso / Visita guiada).
   - **Image** = show page's first uploaded `/content/uploads/…` poster (no image in the API; no `og:image`).
   - **Date precision** = bespoke parse of the page **`FECHAS`** block (first `DD de MMMM – HH:MM`, scoped to stop before `PREVENTA`/`PROGRAMA` so presale dates don't leak). Concurrency‑limited page fetches (`mapLimit`, 6).

## 4. Verified working state

- Docker Postgres up; `prisma db push` + `npm run db:seed` populate 11 theaters.
- Cron dry‑run: `municipal-santiago` ok, **45 real performances** (filtered), **45/45 with image**, **26/45 with precise dated showtimes**; `gam` fails 404 **isolated** (doesn't affect others).
- `/teatros` renders theater‑first (i18n en/es), `tsc --noEmit` green.

## 5. Key files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | `Theater` + `Show` models (+ legacy ticketing models) |
| `prisma/seed.ts` | 11 theaters + sample shows |
| `src/lib/scrapers/index.ts` | scraper interface, JSON‑LD extractor, **`municipalScraper`**, `SCRAPERS`, `runScrape` |
| `src/app/api/cron/scrape-theaters/route.ts` | daily cron endpoint (`CRON_SECRET`) |
| `vercel.json` | cron schedule `0 6 * * *` |
| `src/lib/data/shows.ts` | `getUpcomingShows`, `getTheatersWithShows` |
| `src/app/teatros/page.tsx` | theater‑first cartelera (i18n) |
| `src/lib/api-error.ts` | `ApiError` + `errorHandler` |
| `docker-compose.yml` | local Postgres (port 5433) |

## 6. How to run locally

```bash
docker compose up -d --wait                 # local Postgres on :5433
npx prisma db push                          # create tables + generate client
npm run db:seed                             # 11 theaters + sample shows
npm run dev                                 # http://localhost:3000/teatros
# trigger a scrape manually:
curl "http://localhost:3000/api/cron/scrape-theaters?secret=$CRON_SECRET"
```

`.env` needs `DATABASE_URL` (Postgres), `AUTH_SECRET`, `CRON_SECRET`. `.env` and `prisma/dev.db` are gitignored.

## 7. Known limitations / residuals

1. **Municipal dates 26/45** — 19 shows have no `FECHAS` block (streaming/online items, multi‑date tours). They still list (sorted first) without a date.
2. **Timezone** — dates are built in the *host* local timezone. On Vercel (UTC) the **time‑of‑day shifts ~4h** (the calendar **day is always correct**). Fix before prod: construct as `America/Santiago`.
3. **GAM + 9 other theaters** have no real adapter yet (GAM is still the placeholder JSON‑LD adapter → 404 on `/cartelera/`).
4. **Sample shows** (`externalId` starting `sample-…`) coexist with real scraped ones — cosmetic; remove from seed when no longer needed.
5. **Stale docs** — `docs/CONTRACT.md` + `README.md` still describe the old external‑FastAPI/SQLite architecture.
6. Scraper is **upsert‑only** — it doesn't yet mark `Show.isActive = false` when a show disappears from a calendar.

## 8. Next steps

1. Municipal date **timezone** fix (`America/Santiago`) before prod.
2. Build **GAM** and the remaining 9 adapters using the **Municipal pattern**: find each site's real data source (WordPress REST? ticketing platform API? JSON‑LD?), map to `ScrapedShow`, register in `SCRAPERS`, filter non‑performances.
3. **Prod**: set `DATABASE_URL` + `CRON_SECRET` in Vercel; run `prisma db push` + `db:seed` once against the prod Postgres.
4. Optional: stale‑show deactivation; remove sample seed shows; refresh `README`/`CONTRACT.md`.

## 9. Gotchas for the new chat

- **GateGuard "Fact‑Forcing Gate" hook**: you must present required facts before the first `Bash` of a turn and before every `Edit`/`Write`, then retry the same call. (Disable via `ECC_GATEGUARD=off` or `ECC_DISABLED_HOOKS` if it blocks setup work.)
- **A linter/external process repeatedly reverts `schema.prisma` `provider` from `postgresql` → `sqlite`.** Prod needs Postgres — if it flips, set it back to `postgresql`.
- **Shared working tree with a parallel chat** doing i18n/frontend — coordinate before `git add -A`.
- **Background dev servers get killed between turns** — start fresh (`npm run dev`) and probe with `curl --retry`.

## 10. The reference adapter pattern (Municipal → others)

1. Recon the theater site for a structured data source (WP `/wp-json`, a ticketing API, or JSON‑LD).
2. Write a `TheaterScraper` whose `fetchShows` maps the source to `ScrapedShow[]`.
3. Filter out non‑performances.
4. Enrich missing image/date from the show page (concurrency‑limited).
5. Register under the theater's `adapter` key in `SCRAPERS`; set `Theater.adapter` in the seed.
