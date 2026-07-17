import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { clientIp, consumeRateLimit, resetRateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Brute-force protection. The scopes are shared with /api/v1/auth/login so
  // alternating endpoints does not double the attempt budget.
  const ipLimit = consumeRateLimit('login_ip', clientIp(req.headers));
  if (!ipLimit.ok) return tooManyRequests(ipLimit);

  const body = await req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { email, password } = result.data;

  const emailLimit = consumeRateLimit('login_email', email.toLowerCase());
  if (!emailLimit.ok) return tooManyRequests(emailLimit);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  // Successful login clears the per-email budget so real users never
  // accumulate lockout from their own activity.
  resetRateLimit('login_email', email.toLowerCase());

  const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role as 'visitor' | 'organizer' });
  setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
