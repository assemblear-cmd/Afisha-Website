import {
  RATE_LIMIT_RULES,
  clearRateLimitStore,
  clientIp,
  consumeRateLimit,
  resetRateLimit,
} from '@/lib/rate-limit';

// The limiter is a token bucket: burst up to `limit`, refill at
// `limit / windowSec` tokens per second. Tests inject `now` to control time.

const T0 = 1_700_000_000_000; // fixed base timestamp

beforeEach(() => {
  clearRateLimitStore();
  delete process.env.RATE_LIMIT_DISABLED;
});

// ---------------------------------------------------------------------------
// consumeRateLimit — burst and blocking
// ---------------------------------------------------------------------------
describe('consumeRateLimit', () => {
  const rule = RATE_LIMIT_RULES.login_ip; // 10 per 60s

  it('allows a full burst up to the limit', () => {
    for (let i = 0; i < rule.limit; i++) {
      expect(consumeRateLimit('login_ip', '1.2.3.4', T0).ok).toBe(true);
    }
  });

  it('blocks the request right after the burst is exhausted', () => {
    for (let i = 0; i < rule.limit; i++) {
      consumeRateLimit('login_ip', '1.2.3.4', T0);
    }
    const result = consumeRateLimit('login_ip', '1.2.3.4', T0);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('reports remaining tokens as the burst is consumed', () => {
    const first = consumeRateLimit('login_ip', '1.2.3.4', T0);
    expect(first.remaining).toBe(rule.limit - 1);
    const second = consumeRateLimit('login_ip', '1.2.3.4', T0);
    expect(second.remaining).toBe(rule.limit - 2);
  });

  it('computes an exact advisory retryAfterSec when blocked', () => {
    for (let i = 0; i < rule.limit; i++) {
      consumeRateLimit('login_ip', '1.2.3.4', T0);
    }
    const blocked = consumeRateLimit('login_ip', '1.2.3.4', T0);
    // One token refills in windowSec / limit = 60/10 = 6 seconds.
    expect(blocked.retryAfterSec).toBe(rule.windowSec / rule.limit);
  });

  it('refills one token after windowSec/limit seconds — one request passes, the next blocks', () => {
    for (let i = 0; i < rule.limit; i++) {
      consumeRateLimit('login_ip', '1.2.3.4', T0);
    }
    const oneTokenMs = (rule.windowSec / rule.limit) * 1000;
    expect(consumeRateLimit('login_ip', '1.2.3.4', T0 + oneTokenMs).ok).toBe(true);
    expect(consumeRateLimit('login_ip', '1.2.3.4', T0 + oneTokenMs).ok).toBe(false);
  });

  it('fully refills after a whole window and allows a new burst', () => {
    for (let i = 0; i <= rule.limit; i++) {
      consumeRateLimit('login_ip', '1.2.3.4', T0);
    }
    const later = T0 + rule.windowSec * 1000;
    for (let i = 0; i < rule.limit; i++) {
      expect(consumeRateLimit('login_ip', '1.2.3.4', later).ok).toBe(true);
    }
    expect(consumeRateLimit('login_ip', '1.2.3.4', later).ok).toBe(false);
  });

  it('never refills above the burst capacity', () => {
    consumeRateLimit('login_ip', '1.2.3.4', T0);
    // A very long quiet period must not bank more than `limit` tokens.
    const muchLater = T0 + 100 * rule.windowSec * 1000;
    for (let i = 0; i < rule.limit; i++) {
      expect(consumeRateLimit('login_ip', '1.2.3.4', muchLater).ok).toBe(true);
    }
    expect(consumeRateLimit('login_ip', '1.2.3.4', muchLater).ok).toBe(false);
  });

  it('tracks keys independently', () => {
    for (let i = 0; i <= rule.limit; i++) {
      consumeRateLimit('login_ip', 'attacker', T0);
    }
    expect(consumeRateLimit('login_ip', 'attacker', T0).ok).toBe(false);
    expect(consumeRateLimit('login_ip', 'bystander', T0).ok).toBe(true);
  });

  it('tracks scopes independently for the same key', () => {
    for (let i = 0; i <= rule.limit; i++) {
      consumeRateLimit('login_ip', '1.2.3.4', T0);
    }
    expect(consumeRateLimit('login_ip', '1.2.3.4', T0).ok).toBe(false);
    expect(consumeRateLimit('register_ip', '1.2.3.4', T0).ok).toBe(true);
  });

  it('survives a backwards clock without draining the bucket further', () => {
    consumeRateLimit('login_ip', '1.2.3.4', T0);
    const result = consumeRateLimit('login_ip', '1.2.3.4', T0 - 60_000);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(rule.limit - 2);
  });

  it('is a no-op when RATE_LIMIT_DISABLED=1', () => {
    process.env.RATE_LIMIT_DISABLED = '1';
    for (let i = 0; i < rule.limit * 3; i++) {
      expect(consumeRateLimit('login_ip', '1.2.3.4', T0).ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// resetRateLimit
// ---------------------------------------------------------------------------
describe('resetRateLimit', () => {
  it('restores the full burst for the key (successful-login reset)', () => {
    const rule = RATE_LIMIT_RULES.login_email;
    for (let i = 0; i <= rule.limit; i++) {
      consumeRateLimit('login_email', 'user@example.com', T0);
    }
    expect(consumeRateLimit('login_email', 'user@example.com', T0).ok).toBe(false);

    resetRateLimit('login_email', 'user@example.com');
    expect(consumeRateLimit('login_email', 'user@example.com', T0).ok).toBe(true);
  });

  it('does not affect other keys in the same scope', () => {
    consumeRateLimit('login_email', 'a@example.com', T0);
    consumeRateLimit('login_email', 'b@example.com', T0);
    resetRateLimit('login_email', 'a@example.com');
    const b = consumeRateLimit('login_email', 'b@example.com', T0);
    expect(b.remaining).toBe(RATE_LIMIT_RULES.login_email.limit - 2);
  });
});

// ---------------------------------------------------------------------------
// clientIp
// ---------------------------------------------------------------------------
describe('clientIp', () => {
  it('takes the first entry of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  it('trims whitespace around the forwarded entry', () => {
    const headers = new Headers({ 'x-forwarded-for': '  203.0.113.7  ,10.0.0.1' });
    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.2' });
    expect(clientIp(headers)).toBe('198.51.100.2');
  });

  it('falls back to "unknown" when no IP headers are present', () => {
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
