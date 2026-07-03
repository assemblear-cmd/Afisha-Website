# Afisha 🎟️

**Discover and sell tickets to events.** Afisha is an Eventbrite-style MVP — a full‑stack web app where visitors search and book tickets, and organizers publish their own events. Built with Next.js 14, TypeScript, Prisma and Tailwind CSS.

> This is an original demo project. It reproduces the *type* of structure, layout and user flows you'd expect from an event‑ticketing marketplace, with its own brand, placeholder copy and freely‑generated imagery.

---

## Table of contents

1. [Features](#features)
2. [Screens & user flows](#screens--user-flows)
3. [Tech stack & why](#tech-stack--why-it-was-chosen)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [Project structure](#project-structure)
7. [Getting started](#getting-started)
8. [Demo accounts](#demo-accounts)
9. [Testing](#testing)
10. [Design system](#design-system)
11. [Security notes](#security-notes)
12. [Building this with ECC (agents / skills / commands)](#building-this-with-ecc-agents--skills--commands)

---

## Features

- **Home** — dark hero with a multi‑field search (keyword, location, date, category), category browser, and a responsive grid of upcoming‑event cards.
- **Catalog / search** — `/events` with server‑side filtering by keyword, city, category and date.
- **Event page** — cover image, full description, date/time, venue & address, organizer, live ticket‑type picker with quantity steppers, running total and a **Checkout** button.
- **Checkout** — a **simulated** payment form (card number, name, expiry, CVC) with real client‑ and server‑side validation (Luhn, expiry, CVC). No real transaction occurs and **card data is never stored**.
- **Auth** — email/password registration and login with two roles (**visitor** / **organizer**), JWT in an httpOnly cookie.
- **Organizer tools** — a dashboard listing your events with sales stats, and a **Create event** form with dynamic ticket types.
- **Responsive** — mobile and desktop layouts throughout.

## Screens & user flows

| Route | Description |
|---|---|
| `/` | Home: hero search + category browser + upcoming events |
| `/events` | Catalog with filters (`?query=&city=&category=&date=`) |
| `/events/[id]` | Event detail + ticket selection |
| `/events/[id]/checkout` | Simulated checkout |
| `/orders/[id]` | Order confirmation |
| `/login`, `/register` | Authentication |
| `/dashboard` | Organizer dashboard (event sales overview) |
| `/dashboard/events/new` | Create‑event form (organizer only) |

API (Next.js Route Handlers): `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`, `GET/POST /api/events`, `GET /api/events/[id]`, `POST /api/orders`.

---

## Tech stack & why it was chosen

The stack was proposed by the **architect** step of the pipeline. Rationale:

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **Next.js 14 (App Router) + TypeScript** | One codebase for frontend **and** backend — React Server Components render the catalog with SSR (important for SEO on a discovery product), and Route Handlers provide the REST API. Component architecture is first‑class. |
| **Styling** | **Tailwind CSS 3** | The Afisha palette lives as design tokens in `tailwind.config.ts`; utility classes keep components self‑contained and make responsive layout fast, with no global‑CSS sprawl. |
| **ORM / DB** | **Prisma + SQLite** | Zero external services — `npm run setup` creates and seeds a local SQLite file, so the app runs anywhere with one command. The schema is written to be **Postgres‑portable** (see [migrating to Postgres](#migrating-to-postgres)). |
| **Auth** | **JWT (`jose`) in an httpOnly cookie + `bcryptjs`** | Stateless sessions with role claims (`visitor`/`organizer`), edge‑compatible, no third‑party auth dependency. |
| **Validation** | **Zod** | A single source of truth for input shapes, shared by client forms and server handlers (`src/lib/validations.ts`). |
| **Unit tests** | **Vitest + Testing Library** | Fast, ESM‑native, same config style as Vite. |
| **E2E tests** | **Playwright** (Page Object Model) | Drives the real browser through the critical journeys. |

### Why SQLite for an MVP (and not Postgres)?

The brief asks for a runnable MVP. SQLite removes the "install and configure a database server" step entirely while preserving relational modelling, transactions and migrations. Because Prisma abstracts the database, moving to Postgres is a config change, not a rewrite.

#### Migrating to Postgres

1. `datasource db { provider = "postgresql" }` in `prisma/schema.prisma`.
2. Set `DATABASE_URL="postgresql://…"` in `.env`.
3. Optionally promote the string `role`/`status` fields to native Postgres `enum`s.
4. `npx prisma migrate dev` instead of `db push`.
5. For high‑concurrency ticket sales, replace the in‑transaction availability re‑check with a `SELECT … FOR UPDATE` row lock or a `CHECK (sold <= quantity)` constraint.

---

## Architecture

```
Browser
  │  (RSC / fetch)
  ▼
Next.js App Router ──────────────────────────────┐
  • Server Components  → read DB directly via Prisma (catalog, detail, dashboard)
  • Client Components  → search bar, ticket selector, checkout & create-event forms
  • Route Handlers     → /api/* REST endpoints (auth, events, orders)
  │
  ▼
lib/  (auth · validations · format · categories · prisma singleton)
  │
  ▼
Prisma Client ──► SQLite (prisma/dev.db)
```

- **Server Components fetch from the database directly** (no internal HTTP hop) for first‑paint pages.
- **Mutations go through Route Handlers** so they can be called from client forms and enforce auth/role checks server‑side.
- **All money is stored in integer cents** and formatted at the edges (`lib/format.ts`).

## Data model

```
User (id, email, passwordHash, name, role)
  └─ 1:N ─► Event (title, description, category, venue, city, address,
                   startsAt, endsAt, coverImage, isPublished, organizerId)
                └─ 1:N ─► TicketType (name, priceCents, quantity, sold)
Order (buyerName, buyerEmail, totalCents, status, eventId, userId?)
  └─ 1:N ─► OrderItem (ticketTypeId, quantity, unitPriceCents)
```

`sold` on `TicketType` is incremented inside the checkout transaction; remaining availability is `quantity - sold`.

## Project structure

```
afisha-website/
├── prisma/
│   ├── schema.prisma        # Models: User, Event, TicketType, Order, OrderItem
│   └── seed.ts              # 3 users + 12 events + ticket types (idempotent)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout: Header + Footer
│   │   ├── page.tsx         # Home (hero, search, categories, grid)
│   │   ├── globals.css
│   │   ├── events/
│   │   │   ├── page.tsx              # Catalog + filters
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Event detail
│   │   │       └── checkout/page.tsx # Checkout
│   │   ├── orders/[id]/page.tsx      # Confirmation
│   │   ├── login/ · register/        # Auth pages
│   │   ├── dashboard/                # Organizer dashboard + create event
│   │   └── api/                      # auth · events · orders route handlers
│   ├── components/
│   │   ├── ui/        # Button, Input, Select, Field, Badge, Card, Container, …
│   │   ├── layout/    # Header, Footer
│   │   ├── events/    # EventCard, EventGrid, SearchBar, CategoryFilter, TicketSelector, CreateEventForm
│   │   ├── auth/      # AuthForm
│   │   └── checkout/  # CheckoutForm
│   ├── lib/           # prisma, auth, validations, format, categories
│   └── types/         # shared TypeScript types
├── tests/
│   ├── unit/          # Vitest: format + validation (card/Luhn/zod)
│   └── e2e/           # Playwright POM: search, detail, checkout, auth, organizer
└── (config) next.config.mjs · tailwind.config.ts · vitest.config.ts · playwright.config.ts · tsconfig.json
```

---

## Getting started

**Prerequisites:** Node.js 18.18+ (tested on Node 22) and npm.

```bash
# 1. install dependencies
npm install

# 2. create the .env (an example is provided)
cp .env.example .env      # then set AUTH_SECRET to a long random string

# 3. create the SQLite database and seed demo data
npm run setup             # = prisma db push + seed

# 4. run the dev server
npm run dev               # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Push schema + seed the database |
| `npm run db:seed` | Re‑seed only |
| `npm run db:reset` | Wipe + recreate + re‑seed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E (auto‑starts a server on :3100) |

## Demo accounts

Seeded by `prisma/seed.ts` (password for all three: **`password123`**):

| Role | Email |
|---|---|
| Organizer | `organizer@afisha.test` |
| Organizer | `studio@afisha.test` |
| Visitor | `visitor@afisha.test` |

**Demo card for checkout:** `4242 4242 4242 4242`, any future expiry (e.g. `12/30`), any 3‑digit CVC. No payment is processed.

---

## Testing

- **Unit (Vitest):** `npm test` — 68 tests covering money/date formatting and validation (Luhn card check, expiry/CVC, and every Zod schema).
- **E2E (Playwright, Page Object Model):** `npm run test:e2e` — covers the five critical journeys: **search → results**, **open an event**, **guest checkout**, **register**, and **organizer creates an event**. Page Objects live in `tests/e2e/pages/`. Run `npm run setup` first so the database has data.

## Design system

Defined as Tailwind tokens in `tailwind.config.ts`:

| Token | Hex | Usage |
|---|---|---|
| `coral` | `#F05537` | CTAs, links, active elements |
| `ink` | `#1E0A3C` | Headings, header, footer |
| `body` | `#39364F` | Primary text |
| `muted` | `#6F7287` | Secondary text |
| `success` | `#3EB489` | Success / status |
| `surface` | `#F8F7FA` | Light section backgrounds |

Font: **Inter** with a `system-ui` fallback. Reusable primitives live in `src/components/ui/`.

## Security notes

- Passwords are hashed with **bcrypt** (cost 10); plaintext is never stored.
- Sessions are **signed JWTs** in an **httpOnly, sameSite=lax** cookie (`secure` in production).
- **Set `AUTH_SECRET`** to a long random value in any non‑local environment.
- **Checkout never trusts client‑sent prices** — totals and unit prices are re‑derived from the database, and ticket availability is re‑checked inside the order transaction to prevent overselling.
- **Card details are validated for format only and never persisted** — the payment is simulated.
- All inputs are validated with Zod on the server.

---

## Building this with ECC (agents / skills / commands)

This project was scaffolded and verified with the **ECC (Engineering Command Center)** plugin pipeline. If you have the ECC plugin installed in Claude Code, you can reproduce or extend the workflow with the same agents, skills and commands.

### Setup

ECC is a Claude Code plugin. Once installed, its agents/skills/commands are available in any session (see the plugin's own docs for installation). A `GateGuard` fact‑forcing hook ships with ECC; for greenfield scaffolding it can be relaxed with `ECC_GATEGUARD=off`.

### The pipeline used here

| Phase | ECC agents / skills / commands |
|---|---|
| **1. Planning** | `/plan` → **planner** agent for MVP decomposition; **architect** agent for stack, schema & system design; `/multi-plan` for splitting into parallel services |
| **2. Research** | `search-first` skill; `frontend-patterns`, `backend-patterns`, `api-design`, `database-migrations`, `postgres-patterns` skills |
| **3. Development (TDD)** | **tdd-guide** agent + `tdd-workflow` skill; `/multi-execute`, `/multi-frontend`, `/multi-backend` for multi‑service orchestration. Implementation was delegated to parallel sub‑agents per service slice (auth · discovery · checkout/organizer). |
| **4. Quality & security** | **code-reviewer**, **typescript-reviewer**, **database-reviewer**, **security-reviewer** agents; `security-review` skill + `/security-scan`; **build-error-resolver** + `/build-fix`; `/quality-gate` |
| **5. E2E** | **e2e-runner** agent + `e2e-testing` skill (Playwright, Page Object Model) |
| **6. Cleanup & docs** | **refactor-cleaner** + `/refactor-clean`; **doc-updater** + `/update-docs` |
| **7. Git** | `git-workflow` rules — working branch, meaningful commits, push |

### How to run them

In a Claude Code session inside this repo:

```
/plan            # restate + decompose a new feature
/multi-plan      # split into parallel work
/build-fix       # auto-fix build / type errors
/security-scan   # AgentShield security pass
/quality-gate    # final quality gate
/refactor-clean  # dead-code cleanup
/update-docs     # regenerate documentation
```

Agents are invoked with the Task/Agent tool (e.g. *“use the security-reviewer agent on src/app/api”*). Skills are invoked by name (e.g. *“apply the tdd-workflow skill”*). Run `/ecc-guide` for the live catalogue of what's available in your install.

---

## License

Demo / educational project.
