# Rate limiting

Module: `src/lib/rate-limit.ts` · Tests: `tests/unit/rate-limit.test.ts`

This document explains the rate-limiting module added to protect abuse-prone
API routes: what it does, the design decisions behind it, and how to extend or
replace it.

## Why

Before this module the API had no throttling. Concretely, that left open:

- **Credential brute force / stuffing** on `POST /api/auth/login` and
  `/api/v1/auth/login` — unlimited password guesses against any email.
- **Mass account creation** on the register endpoints.
- **Google endpoint abuse** — every call runs a JWKS verification and a DB
  lookup.
- **Authenticated write floods** — each `/api/scan` writes a `TicketScan` row,
  each `/api/checkout` and `/api/promotions/checkout` creates DB rows plus a
  Stripe session, and each `/api/uploads/event-cover` writes up to 5 MB to disk.

The goal is a small, dependency-free first line of defence that meaningfully
raises the cost of these attacks without harming legitimate users, and that can
be swapped for a distributed store later without touching the routes.

## What it does

A single function guards a route:

```ts
const limit = consumeRateLimit('login_ip', clientIp(req.headers));
if (!limit.ok) return tooManyRequests(limit);
```

- `consumeRateLimit(scope, key)` deducts one token from the `(scope, key)`
  bucket and returns `{ ok, retryAfterSec, remaining }`.
- `tooManyRequests(result)` returns a `429` with a `Retry-After` header and the
  shape `{ error: string }` the frontend already understands.
- `clientIp(headers)` derives the per-IP key.
- `resetRateLimit(scope, key)` clears a bucket — used on successful login.

## Architecture

### Algorithm: token bucket

Each `(scope, key)` pair owns a bucket that:

- holds at most `limit` tokens (the **burst** capacity),
- refills **continuously** at `limit / windowSec` tokens per second,
- costs one token per request; at `< 1` token the request is rejected.

Only two numbers are stored per key (`tokens`, `updatedAt`) and refill is
computed lazily on read, so there is no background timer and memory is O(1) per
active key.

Why token bucket over a fixed window counter:

- **No window-edge burst.** A fixed window of "N per minute" lets an attacker
  send N at 00:59 and N at 01:00 — 2N in two seconds. The bucket caps the burst
  at `limit` and then paces strictly.
- **Exact `Retry-After`.** The time to refill one token is
  `(1 - tokens) / rate`, so clients get an honest wait hint.
- **Smooth recovery.** Legitimate users regain one request every
  `windowSec / limit` seconds instead of waiting for a hard window reset.

### Storage: in-process Map

Counters live in a module-level `Map`. This is deliberate for the current
single-region deployment:

- **Zero dependencies / zero latency** — no Redis round-trip on the hot path.
- **Good enough** — it stops scripted floods, which is the threat model.

Accepted trade-off — **per-instance counting.** On serverless/multi-instance
hosting each warm instance keeps its own Map, so the effective ceiling is
`limit × instances`. That is fine for brute-force defence (the attacker cannot
choose their instance and every instance still caps them) and is documented
rather than hidden. When a global limit becomes necessary, replace the Map with
a shared store — see [Replacing the store](#replacing-the-store).

Memory is bounded two ways: a periodic sweep (every 60s, on access) drops
buckets that have fully refilled, and a hard cap of 100k keys evicts oldest
entries if the map ever balloons. Evicting a key only re-grants one burst, so
eviction is safe under flood.

### Keys and scopes

- **Per-IP** (`login_ip`, `register_ip`, `google_ip`, `checkout_ip`) for
  unauthenticated or guest routes. `clientIp` reads the first entry of
  `x-forwarded-for`, then `x-real-ip`, then `"unknown"`.
- **Per-user** (`scan_user`, `promo_checkout_user`, `upload_user`) for
  authenticated routes, keyed by the session user id — more precise than IP and
  immune to NAT/shared-IP false positives.

Scopes are **shared across route variants.** The web (`/api/auth/login`) and
mobile (`/api/v1/auth/login`) endpoints both consume `login_ip` + `login_email`
with the same keys, so an attacker cannot double their budget by alternating
endpoints. The same holds for the two register routes.

### Two-key defence on login

Login consumes **both** an IP budget and an email budget:

- `login_ip` (10 / min) blunts a single source hammering many accounts.
- `login_email` (15 / 15 min) blunts a distributed attack focused on one
  account, where each request comes from a different IP.

The per-email bucket is **reset on successful login**, so a legitimate user who
signs in normally never accumulates lockout from their own activity — only
failed attempts erode the budget.

## Configured limits

Defined in `RATE_LIMIT_RULES` (`src/lib/rate-limit.ts`):

| Scope                 | Key      | Limit | Window | Guards                              |
| --------------------- | -------- | ----- | ------ | ----------------------------------- |
| `login_ip`            | IP       | 10    | 1 min  | login (web + v1)                    |
| `login_email`         | email    | 15    | 15 min | login (web + v1)                    |
| `register_ip`         | IP       | 10    | 10 min | register (web + v1)                 |
| `google_ip`           | IP       | 20    | 1 min  | Google sign-in                      |
| `scan_user`           | user id  | 120   | 1 min  | ticket scan (~2/sec sustained)      |
| `checkout_ip`         | IP       | 10    | 1 min  | ticket checkout                     |
| `promo_checkout_user` | user id  | 10    | 1 min  | promotion checkout                  |
| `upload_user`         | user id  | 20    | 10 min | cover-image upload                  |

Limits are intentionally generous for humans and tight against scripts. Adjust
by editing `RATE_LIMIT_RULES` — the scope keys and route wiring stay unchanged.

## Behaviour on the wire

A blocked request returns:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 6

{"error":"Too many requests. Please try again shortly."}
```

`Retry-After` is the whole number of seconds until one token refills.

## Disabling for tests and load runs

Set `RATE_LIMIT_DISABLED=1` to make `consumeRateLimit` a no-op. The Playwright
config sets this on its dev server (all e2e traffic shares one IP, which would
otherwise make the suite order-dependent). **Never enable it in production.**

## Testing

`tests/unit/rate-limit.test.ts` (17 tests) injects a fixed `now` to assert the
timing exactly, without real clocks:

- burst up to `limit`, then block;
- exact `retryAfterSec` and `remaining`;
- single-token refill after `windowSec / limit`, full refill after `windowSec`;
- refill never exceeds burst capacity;
- key isolation, scope isolation, and shared scopes;
- backwards-clock safety;
- `resetRateLimit` restores the burst without touching neighbours;
- `RATE_LIMIT_DISABLED` bypass;
- `clientIp` header precedence.

The behaviour was also smoke-tested against a running dev server: 10 login
attempts from one IP returned `400`, the 11th returned `429` with
`Retry-After: 6`, and 16 requests alternating the web and v1 login endpoints
allowed exactly 10 total before blocking — confirming the shared budget.

## Replacing the store

To enforce a **global** limit across instances, back the counters with Redis
(e.g. Upstash) or another shared store. Only `src/lib/rate-limit.ts` changes:
keep the `consumeRateLimit` / `resetRateLimit` signatures and reimplement the
bucket read-modify-write against the store (a Lua script or `INCR`+`EXPIRE`
keeps it atomic). No route code changes, because routes depend only on those
two functions plus `clientIp` / `tooManyRequests`.

## Known limitations

- **Per-instance counting** on multi-instance hosting (see above).
- **IP spoofing on untrusted proxies.** `x-forwarded-for` is trustworthy behind
  a platform proxy that sets it (e.g. Vercel). On a bare self-hosted deployment
  with no trusted proxy, a client can forge the header to dodge per-IP limits —
  the per-user and per-email limits still apply. Terminate behind a proxy you
  control before relying on per-IP limits there.
- **Not a WAF.** This is application-level throttling, not DDoS protection.
  Volumetric attacks belong at the edge/CDN.
