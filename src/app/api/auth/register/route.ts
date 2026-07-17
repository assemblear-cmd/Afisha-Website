import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { clientIp, consumeRateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Mass-registration protection; budget shared with /api/v1/auth/register.
  const limit = consumeRateLimit('register_ip', clientIp(req.headers));
  if (!limit.ok) return tooManyRequests(limit);

  const body = await req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { name, email, password, role } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role as 'visitor' | 'organizer' });
  setAuthCookie(token);

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    { status: 201 }
  );
}
