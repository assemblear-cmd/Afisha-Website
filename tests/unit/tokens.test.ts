import { describe, expect, it } from 'vitest';
import { extractToken, generateTicketToken, qrPayloadForToken, QR_PREFIX } from '@/lib/tickets/tokens';

describe('ticket tokens', () => {
  it('generates unique, URL-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateTicketToken()));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThanOrEqual(16);
    }
  });

  it('round-trips through the QR payload', () => {
    const token = generateTicketToken();
    expect(extractToken(qrPayloadForToken(token))).toBe(token);
  });

  it('accepts a bare token pasted manually (with whitespace)', () => {
    const token = generateTicketToken();
    expect(extractToken(`  ${token} `)).toBe(token);
  });

  it('extracts tokens from URLs', () => {
    const token = generateTicketToken();
    expect(extractToken(`https://dondego.cl/scan?token=${token}`)).toBe(token);
    expect(extractToken(`https://dondego.cl/t/${token}`)).toBe(token);
  });

  it('rejects garbage input', () => {
    expect(extractToken('')).toBeNull();
    expect(extractToken('   ')).toBeNull();
    expect(extractToken('short')).toBeNull();
    expect(extractToken(`${QR_PREFIX}not valid token!!!`)).toBeNull();
    expect(extractToken('https://dondego.cl/')).toBeNull();
  });
});
