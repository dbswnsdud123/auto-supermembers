import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fetchPlaceInfo } from '@/lib/naver-place';
import { listSources } from '@/lib/db';
import type { StyleProfile } from '@/lib/style-profile';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  const id = body.id?.trim();
  if (!id) return new NextResponse('id 필수', { status: 400 });

  try {
    const info = await fetchPlaceInfo(id);

    if (info.description && process.env.OPENAI_API_KEY) {
      try {
        const summary = await summarizeDescription(info.description);
        if (summary) info.description = summary;
      } catch {
        // fall back to raw description on summarization failure
      }
    }

    return NextResponse.json(info);
  } catch (e: any) {
    return new NextResponse(e?.message || String(e), { status: 500 });
  }
}

async function summarizeDescription(description: string): Promise<string | null> {
  const profiles = await loadStyleProfiles();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o';

  const styleHint =
    profiles.length > 0
      ? `작성자의 말투 특징 (이 말투 그대로 요약하세요):\n${profiles
          .slice(0, 3)
          .map(
            (p, i) =>
              `${i + 1}. 톤: ${p.tone} / 어미: ${p.common_endings.slice(0, 4).join(', ')} / 표현: ${p.common_phrases.slice(0, 4).join(', ')} / 이모지: ${p.emoji_usage}`,
          )
          .join('\n')}`
      : '자연스러운 한국어 블로그 톤으로 작성하세요.';

  const systemPrompt = `네이버 플레이스에 올라온 가게 소개글을, 블로거의 말투로 4~5줄 분량으로 깔끔하게 요약합니다.

${styleHint}

규칙:
- 광고성 문구, 과장 표현, 이모지 남용은 제거
- 핵심 컨셉·대표 메뉴·분위기·특징 중심으로
- 4~5줄, 각 줄은 간결하게
- 요약문만 출력 (설명·인사·메타 코멘트 금지)`;

  const res = await openai.chat.completions.create({
    model,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description },
    ],
  });

  const out = res.choices[0]?.message?.content?.trim();
  return out || null;
}

async function loadStyleProfiles(): Promise<StyleProfile[]> {
  try {
    const sources = await listSources();
    return sources
      .slice(0, 3)
      .map((s) => {
        try {
          return JSON.parse(s.profile_json) as StyleProfile;
        } catch {
          return null;
        }
      })
      .filter((p): p is StyleProfile => p !== null);
  } catch {
    return [];
  }
}
