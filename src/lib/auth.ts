import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'afisha_token';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');

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
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
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
