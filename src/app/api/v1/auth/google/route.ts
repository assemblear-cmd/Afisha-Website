import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { clientIp, consumeRateLimit, tooManyRequests } from '@/lib/rate-limit';

// Mobile "Sign in with Google": the app sends the Google ID token it obtained
// on-device; the server verifies it against Google's JWKS (signature, issuer,
// audience, expiry), then finds or creates the matching account and returns the
// DondeGO JWT in the body — same shape as /api/v1/auth/login. The Google ID
// token is the only trust anchor; no claim is trusted before verification.

export const runtime = 'nodejs'; // node:crypto + bcrypt are not Edge-safe.

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

// GOOGLE_CLIENT_ID is the OAuth *web* client ID used as `serverClientId` by the
// Android client, so it is the expected `aud` of the ID token. A comma-separated
// list is allowed (e.g. to accept more than one client during migration).
function allowedAudiences(): string[] {
  return (process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  // Throttled before the JWKS verification and DB work.
  const limit = consumeRateLimit('google_ip', clientIp(req.headers));
  if (!limit.ok) return tooManyRequests(limit);

  const audiences = allowedAudiences();
  if (audiences.length === 0) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured on the server.' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === 'string' ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ error: 'Missing Google ID token.' }, { status: 400 });
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
    }));
  } catch {
    return NextResponse.json({ error: 'Invalid Google token.' }, { status: 401 });
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  // Google encodes email_verified as a boolean, but some tokens use the string.
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!email || !emailVerified) {
    return NextResponse.json(
      { error: 'Google account has no verified email.' },
      { status: 401 }
    );
  }

  const displayName =
    (typeof payload.name === 'string' && payload.name.trim()) || email.split('@')[0];

  // Find-or-create by verified email. An existing password account is linked by
  // the same verified email (Google vouches for it), so its password stays
  // intact. A brand-new Google account gets an unusable random password hash so
  // the column stays non-null and no password can ever match it.
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    user = await prisma.user.create({
      data: { email, name: displayName, passwordHash, role: 'visitor' },
    });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'visitor' | 'organizer' | 'admin',
  };
  const token = await signToken(sessionUser);

  return NextResponse.json({ token, user: sessionUser });
}
