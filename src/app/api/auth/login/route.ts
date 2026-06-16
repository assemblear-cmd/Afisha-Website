import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const body = await req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role as 'visitor' | 'organizer' });
  setAuthCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
