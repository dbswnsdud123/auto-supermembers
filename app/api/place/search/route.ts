import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/naver-place';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  const query = body.query?.trim();
  if (!query) return new NextResponse('query 필수', { status: 400 });

  try {
    const candidates = await searchPlaces(query);
    return NextResponse.json({ candidates });
  } catch (e: any) {
    return new NextResponse(e?.message || String(e), { status: 500 });
  }
}
