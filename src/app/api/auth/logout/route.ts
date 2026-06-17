import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  clearAuthCookie();
  return NextResponse.redirect(new URL('/', req.url), 303);
}
