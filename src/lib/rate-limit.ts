import { NextResponse } from 'next/server';

// In-process token-bucket rate limiter for abuse-prone API routes.
//
// Design notes (full rationale in docs/rate-limiting.md):
// - Token bucket: a key may burst up to `limit`, then refills continuously at
//   `limit / windowSec` tokens per second. O(1) memory per key and an exact
//   Retry-After computation.
// - Storage is an in-memory Map, so on serverless each warm instance counts
//   independently — the effective ceiling is `limit × instances`. That is an
//   accepted MVP trade-off; the consume API is store-agnostic so a shared
//   Redis/Upstash store can replace the Map without touching the routes.
// - Scopes are shared across route variants (web + /api/v1) so an attacker
//   cannot double their budget by alternating endpoints.

export type RateLimitRule = {
  /** Max requests in one full window — also the burst capacity. */
  limit: number;
  /** Window in seconds over which `limit` fully refills. */
  windowSec: number;
};

export const RATE_LIMIT_RULES = {
  // Credential endpoints. Per-IP blunts single-source brute force; the
  // per-email budget blunts distributed attacks on one account and is reset
  // on successful login so real users never accumulate lockout.
  login_ip: { limit: 10, windowSec: 60 },
  login_email: { limit: 15, windowSec: 15 * 60 },
  register_ip: { limit: 10, windowSec: 10 * 60 },
  google_ip: { limit: 20, windowSec: 60 },
  // Authenticated abuse targets: every scan attempt writes a TicketScan row;
  // checkout creates DB orders and Stripe sessions; uploads write files.
  scan_user: { limit: 120, windowSec: 60 },
  checkout_ip: { limit: 10, windowSec: 60 },
  promo_checkout_user: { limit: 10, windowSec: 60 },
  upload_user: { limit: 20, windowSec: 10 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitScope = keyof typeof RATE_LIMIT_RULES;

export type RateLimitResult = {
  ok: boolean;
  /** Advisory seconds until the next request would be accepted; 0 when ok. */
  retryAfterSec: number;
  /** Whole tokens left after this call. */
  remaining: number;
};

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

// Memory bounds: stale entries are swept periodically, and a hard cap guards
// against floods of unique keys (dropping an entry only re-grants one burst).
const SWEEP_INTERVAL_MS = 60_000;
const MAX_ENTRIES = 100_000;
let lastSweepAt = 0;

function isDisabled(): boolean {
  const value = process.env.RATE_LIMIT_DISABLED;
  return value === '1' || value === 'true';
}

function sweep(now: number): void {
  lastSweepAt = now;
  for (const [id, bucket] of buckets) {
    const scope = id.slice(0, id.indexOf(':')) as RateLimitScope;
    const rule = RATE_LIMIT_RULES[scope];
    // A bucket older than its window has fully refilled — identical to no entry.
    if (!rule || now - bucket.updatedAt >= rule.windowSec * 1000) {
      buckets.delete(id);
    }
  }
  if (buckets.size > MAX_ENTRIES) {
    const excess = buckets.size - MAX_ENTRIES;
    let dropped = 0;
    for (const id of buckets.keys()) {
      if (dropped++ >= excess) break;
      buckets.delete(id);
    }
  }
}

/**
 * Consumes one request from the (scope, key) bucket. Pure with respect to
 * `now`, which unit tests inject to control time.
 */
export function consumeRateLimit(
  scope: RateLimitScope,
  key: string,
  now = Date.now()
): RateLimitResult {
  const rule = RATE_LIMIT_RULES[scope];
  if (isDisabled()) {
    return { ok: true, retryAfterSec: 0, remaining: rule.limit };
  }

  if (now - lastSweepAt >= SWEEP_INTERVAL_MS || buckets.size >= MAX_ENTRIES) {
    sweep(now);
  }

  const ratePerMs = rule.limit / (rule.windowSec * 1000);
  const id = `${scope}:${key}`;
  const existing = buckets.get(id);

  let tokens: number = rule.limit;
  if (existing) {
    // Clamp elapsed at 0 so a backwards clock never drains the bucket further.
    const elapsedMs = Math.max(0, now - existing.updatedAt);
    tokens = Math.min(rule.limit, existing.tokens + elapsedMs * ratePerMs);
  }

  if (tokens < 1) {
    buckets.set(id, { tokens, updatedAt: now });
    const retryAfterSec = Math.max(1, Math.ceil((1 - tokens) / ratePerMs / 1000));
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  tokens -= 1;
  buckets.set(id, { tokens, updatedAt: now });
  return { ok: true, retryAfterSec: 0, remaining: Math.floor(tokens) };
}

/**
 * Clears one bucket. Used to reset the per-email login budget on a successful
 * login, so legitimate users never accumulate lockout from their own logins.
 */
export function resetRateLimit(scope: RateLimitScope, key: string): void {
  buckets.delete(`${scope}:${key}`);
}

/** Test-only helper: drop every counter. */
export function clearRateLimitStore(): void {
  buckets.clear();
  lastSweepAt = 0;
}

/**
 * Client IP for per-IP keys. On Vercel `x-forwarded-for` is set by the
 * platform and its first entry is the real client. On a bare self-hosted
 * deployment with no trusted proxy the header is client-controlled — see
 * docs/rate-limiting.md before relying on per-IP limits there.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Standard 429 response with an advisory Retry-After header. */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } }
  );
}
