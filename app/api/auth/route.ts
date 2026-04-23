import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return new NextResponse('Invalid password', { status: 401 });
  }
  const res = new NextResponse('OK');
  res.cookies.set('auth', password, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = new NextResponse('OK');
  res.cookies.set('auth', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
