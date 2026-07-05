import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'afisha_token';

// JWT signing key. Resolved lazily (not at module load) so a missing secret
// fails a request rather than the build. In production a strong AUTH_SECRET is
// mandatory — we never sign or verify tokens with a guessable fallback, which
// would let anyone forge an admin session. Local dev/tests may run without it.
const MIN_SECRET_LENGTH = 16;

function resolveSecret(): Uint8Array {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= MIN_SECRET_LENGTH) {
    return new TextEncoder().encode(configured);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set a strong random value (>= 16 chars) in production.'
    );
  }
  return new TextEncoder().encode(configured || 'dev-only-insecure-secret');
}

// "visitor" is the customer role. "admin" accounts are created by seed or
// directly in the DB — registration never accepts the admin role.
export type UserRole = 'visitor' | 'organizer' | 'admin';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function normalizeRole(role: unknown): UserRole {
  return role === 'organizer' || role === 'admin' ? role : 'visitor';
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(resolveSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, resolveSecret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: normalizeRole(payload.role),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts the JWT from an `Authorization: Bearer <token>` header value.
 * Pure so the parsing rules are unit-testable.
 */
export function bearerToken(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

// Mobile clients authenticate with `Authorization: Bearer <jwt>` (same JWT
// the cookie carries); the web keeps using the httpOnly cookie. The header
// wins when both are present.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const fromHeader = bearerToken(headers().get('authorization'));
  if (fromHeader) return verifyToken(fromHeader);
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyToken(value);
}

export function setAuthCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(): void {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}
