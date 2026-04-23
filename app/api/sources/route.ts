import { NextRequest, NextResponse } from 'next/server';
import { listSources, addSource, findSourceByUrl } from '@/lib/db';
import { fetchNaverBlog } from '@/lib/naver';
import { extractStyleProfile } from '@/lib/style-profile';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    const rows = await listSources();
    return NextResponse.json(
      rows.map((r) => {
        let summary = '';
        try {
          summary = JSON.parse(r.profile_json).summary || '';
        } catch {
          summary = '(프로필 파싱 실패)';
        }
        return {
          id: r.id,
          url: r.url,
          title: r.title,
          summary,
          createdAt: r.created_at,
        };
      })
    );
  } catch (e: any) {
    return new NextResponse(`DB 오류: ${e?.message || e}`, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  const url = body.url?.trim();
  if (!url) return new NextResponse('url 필수', { status: 400 });

  try {
    const { mobileUrl, title, content } = await fetchNaverBlog(url);

    const existing = await findSourceByUrl(mobileUrl);
    if (existing) {
      return new NextResponse('이미 등록된 블로그 글입니다', { status: 409 });
    }

    const profile = await extractStyleProfile(content);
    const id = crypto.randomUUID();
    await addSource({
      id,
      url: mobileUrl,
      title,
      content: content.slice(0, 5000),
      profile_json: JSON.stringify(profile),
    });

    return NextResponse.json({
      id,
      url: mobileUrl,
      title,
      summary: profile.summary,
    });
  } catch (e: any) {
    return new NextResponse(e?.message || String(e), { status: 500 });
  }
}
