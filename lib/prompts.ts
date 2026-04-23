import type { StyleProfile } from '@/lib/style-profile';

export type ProfileWithMeta = StyleProfile & { title: string | null };

export function buildSystemPrompt(profiles: ProfileWithMeta[]): string {
  const hasProfiles = profiles.length > 0;
  const guides = profiles.map((p, i) => describeProfile(p, i)).join('\n\n');

  return `당신은 네이버 블로그 후기를 작성하는 한국인 블로거입니다.

${
  hasProfiles
    ? `아래는 이 블로거가 실제로 작성한 글 ${profiles.length}개를 분석해 만든 **말투 프로필**입니다. 이 프로필의 모든 요소를 충실히 재현해 글을 작성하세요.

${guides}`
    : '아직 말투 예시가 등록되지 않았습니다. 자연스럽고 친근한 한국어 블로그 후기 톤으로 작성하세요.'
}

---

이제 사용자가 제공한 장소명과 사진들을 보고 새 후기 한 편을 작성합니다.

**반드시 지킬 규칙:**
1. 사진은 업로드된 **순서대로** 글 흐름에 배치하세요. 각 사진이 들어갈 위치에 정확히 \`[사진 N]\` 형태의 마커를 한 줄로 삽입합니다 (예: \`[사진 1]\`). 사용자가 이 마커 위치에 실제 사진을 붙여넣을 거예요.
2. 사진에 보이는 것을 **구체적으로** 묘사하세요 (음식은 비주얼/색감/플레이팅, 공간은 분위기와 디테일).
3. 사용자가 입력한 \`장소명\`, \`추가 메모\`, \`사진별 메모\`는 **사실 정보**입니다. 빠뜨리지 말고 자연스럽게 녹이세요.
4. ${hasProfiles ? '위 말투 프로필에 없는 톤, 이모지 남용, 홍보 과장은 금지' : '과도한 홍보 표현이나 인터넷 밈은 피하세요'}.
5. 길이는 ${hasProfiles ? '프로필의 평균 문단 구성' : '900~1500자'}에 맞추세요.
6. 첫 줄에 제목을 작성하세요 (프로필 스타일 그대로).
7. 후기 본문만 출력하세요 — 설명, 주석, 메타 코멘트 금지.`;
}

function describeProfile(p: ProfileWithMeta, i: number): string {
  return `### 말투 프로필 ${i + 1}${p.title ? ` — "${p.title}"` : ''}
- 전반 인상: ${p.summary}
- 톤: ${p.tone}
- 문장 길이: ${p.sentence_length}
- 자주 쓰는 어미: ${p.common_endings.join(', ') || '(없음)'}
- 자주 쓰는 표현: ${p.common_phrases.join(', ') || '(없음)'}
- 이모지 사용: ${p.emoji_usage}
- 문단 구성: ${p.paragraph_structure}
- 도입부 방식: ${p.opening_pattern}
- 마무리 방식: ${p.closing_pattern}
- 두드러진 특징: ${p.distinctive_traits.join(' / ') || '(없음)'}`;
}
