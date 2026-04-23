import OpenAI from 'openai';

export type StyleProfile = {
  summary: string;
  tone: string;
  sentence_length: string;
  common_endings: string[];
  common_phrases: string[];
  emoji_usage: string;
  paragraph_structure: string;
  opening_pattern: string;
  closing_pattern: string;
  distinctive_traits: string[];
};

const SYSTEM_PROMPT =
  '당신은 한국어 블로그 글쓰기 스타일을 분석하는 전문가입니다. 주어진 블로그 글을 분석해 작성자의 글쓰기 습관을 정확히 JSON으로 추출합니다.';

function buildUserPrompt(content: string): string {
  const trimmed = content.slice(0, 8000);
  return `다음 블로그 글을 분석하고 아래 JSON 스키마에 맞춰 말투 프로필을 작성하세요. 모든 값은 한국어로 작성합니다.

스키마:
{
  "summary": "이 글의 전반적 인상 (40자 이내 한 줄)",
  "tone": "톤 설명 (예: 친근한 반말체, 공손한 존댓말, 유머러스 구어체)",
  "sentence_length": "문장 길이 특성 (예: 짧고 경쾌함, 중간 길이, 장문 위주)",
  "common_endings": ["자주 쓰는 어미 3~5개 (예: ~에요, ~더라구요, ~답니다)"],
  "common_phrases": ["자주 쓰는 표현/부사/감탄사 3~7개 (예: 진짜, 너무, 개꿀, 헉)"],
  "emoji_usage": "이모지 사용 빈도와 패턴 (예: 거의 사용 안 함 / 문장 끝마다 1~2개, 자주 쓰는 이모지 목록)",
  "paragraph_structure": "문단 구성 방식 (예: 사진-짧은 설명 반복, 2~3문장 단락, 장문 서술)",
  "opening_pattern": "글 시작 방식의 특징 (예: 인사말 후 장소 소개, 바로 장소명부터)",
  "closing_pattern": "글 마무리 방식의 특징 (예: 재방문 의사 + 별점, 간단한 추천 멘트)",
  "distinctive_traits": ["이 블로거만의 두드러진 특징 2~4개"]
}

분석할 글:
"""
${trimmed}
"""

반드시 위 스키마 구조 그대로 JSON만 출력하세요.`;
}

export async function extractStyleProfile(content: string): Promise<StyleProfile> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다');
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(content) },
    ],
  });

  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('말투 분석 결과를 받지 못했습니다');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('말투 분석 결과(JSON)를 파싱하지 못했습니다');
  }

  return normalizeProfile(parsed);
}

function normalizeProfile(raw: unknown): StyleProfile {
  const o = (raw ?? {}) as Record<string, unknown>;
  const asStr = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  return {
    summary: asStr(o.summary, '(분석 실패)'),
    tone: asStr(o.tone),
    sentence_length: asStr(o.sentence_length),
    common_endings: asList(o.common_endings),
    common_phrases: asList(o.common_phrases),
    emoji_usage: asStr(o.emoji_usage),
    paragraph_structure: asStr(o.paragraph_structure),
    opening_pattern: asStr(o.opening_pattern),
    closing_pattern: asStr(o.closing_pattern),
    distinctive_traits: asList(o.distinctive_traits),
  };
}
