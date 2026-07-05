import { randomBytes } from 'crypto';

// QR payload format: "DGO1.<token>". The token is 24 random bytes
// (base64url), unguessable, stored uniquely on the ticket and carrying no
// personal data. Verification happens server-side against the DB row.
export const QR_PREFIX = 'DGO1.';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function generateTicketToken(): string {
  return randomBytes(24).toString('base64url');
}

export function qrPayloadForToken(token: string): string {
  return `${QR_PREFIX}${token}`;
}

/**
 * QR payload gate for API responses: only ISSUED/CHECKED_IN tickets expose a
 * scannable payload (web parity — the QR is disabled for cancelled, refunded,
 * expired, and invalidated tickets). Pure for unit testing.
 */
export function ticketQrPayload(status: string, token: string): string | null {
  return status === 'ISSUED' || status === 'CHECKED_IN' ? qrPayloadForToken(token) : null;
}

/**
 * Extracts a ticket token from whatever the scanner produced: the canonical
 * "DGO1.<token>" payload, a bare token pasted manually, or a URL that carries
 * a token query/path segment. Returns null when nothing token-shaped is found.
 */
export function extractToken(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.startsWith(QR_PREFIX)) {
    const token = raw.slice(QR_PREFIX.length).trim();
    return TOKEN_PATTERN.test(token) ? token : null;
  }

  if (raw.includes('://')) {
    try {
      const url = new URL(raw);
      const fromQuery = url.searchParams.get('token');
      if (fromQuery && TOKEN_PATTERN.test(fromQuery)) return fromQuery;
      const lastSegment = url.pathname.split('/').filter(Boolean).pop() ?? '';
      return TOKEN_PATTERN.test(lastSegment) ? lastSegment : null;
    } catch {
      return null;
    }
  }

  return TOKEN_PATTERN.test(raw) ? raw : null;
}
