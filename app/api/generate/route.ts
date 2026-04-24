import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt, type ProfileWithMeta } from '@/lib/prompts';
import { listSources } from '@/lib/db';
import type { StyleProfile } from '@/lib/style-profile';
import { formatPlaceInfoForPrompt, type PlaceInfo } from '@/lib/naver-place';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PhotoPayload = { dataUrl: string; memo: string };

type Body = {
  placeName: string;
  extraNotes?: string;
  placeInfo?: PlaceInfo | null;
  photos: PhotoPayload[];
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY가 설정되지 않았습니다', { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { placeName, extraNotes, placeInfo, photos } = body;
  if (!placeName || !photos || photos.length === 0) {
    return new Response('placeName과 photos는 필수입니다', { status: 400 });
  }

  const placeInfoBlock = placeInfo ? formatPlaceInfoForPrompt(placeInfo) : '';

  let profiles: ProfileWithMeta[] = [];
  try {
    const sources = await listSources();
    profiles = sources.slice(0, 5).map((s) => {
      const profile = JSON.parse(s.profile_json) as StyleProfile;
      return { ...profile, title: s.title };
    });
  } catch (e: any) {
    return new Response(`DB 조회 실패: ${e?.message || e}`, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const systemPrompt = buildSystemPrompt(profiles);

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
  > = [
    {
      type: 'text',
      text:
        `장소: ${placeName}` +
        (placeInfoBlock ? `\n\n[네이버 플레이스 정보]\n${placeInfoBlock}` : '') +
        (extraNotes ? `\n\n추가 메모: ${extraNotes}` : '') +
        `\n\n아래에 사진 ${photos.length}장이 순서대로 제공됩니다. 이 순서대로 [사진 N] 마커를 배치해주세요.`,
    },
  ];

  photos.forEach((p, i) => {
    userContent.push({
      type: 'text',
      text: `\n--- [사진 ${i + 1}]${p.memo ? ` 사용자 메모: ${p.memo}` : ''} ---`,
    });
    userContent.push({
      type: 'image_url',
      image_url: { url: p.dataUrl, detail: 'low' },
    });
  });

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (e: any) {
    const msg = e?.error?.message || e?.message || String(e);
    return new Response(`OpenAI 오류: ${msg}`, { status: 500 });
  }
}
