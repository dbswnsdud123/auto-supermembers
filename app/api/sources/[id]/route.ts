import { NextResponse } from 'next/server';
import { deleteSource } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSource(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(`삭제 실패: ${e?.message || e}`, { status: 500 });
  }
}
