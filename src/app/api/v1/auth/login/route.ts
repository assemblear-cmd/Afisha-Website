import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

// Mobile login: same credential check as /api/auth/login, but the JWT is
// returned in the body (no cookie) so the app can store it securely and send
// it back as `Authorization: Bearer <jwt>`.

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
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
