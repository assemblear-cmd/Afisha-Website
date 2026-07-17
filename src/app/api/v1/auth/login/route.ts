import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { clientIp, consumeRateLimit, resetRateLimit, tooManyRequests } from '@/lib/rate-limit';

// Mobile login: same credential check as /api/auth/login, but the JWT is
// returned in the body (no cookie) so the app can store it securely and send
// it back as `Authorization: Bearer <jwt>`.

export async function POST(req: Request) {
  // Shared brute-force budget with /api/auth/login (same scopes, same keys).
  const ipLimit = consumeRateLimit('login_ip', clientIp(req.headers));
  if (!ipLimit.ok) return tooManyRequests(ipLimit);

  const body = await req.json().catch(() => null);
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
  }

  const { email, password } = result.data;

  const emailLimit = consumeRateLimit('login_email', email.toLowerCase());
  if (!emailLimit.ok) return tooManyRequests(emailLimit);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  resetRateLimit('login_email', email.toLowerCase());

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'visitor' | 'organizer' | 'admin',
  };
  const token = await signToken(sessionUser);

  return NextResponse.json({ token, user: sessionUser });
}
