const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export type PlaceCandidate = {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  phone?: string;
};

export type PlaceInfo = PlaceCandidate & {
  hours?: string;
  description?: string;
};

const TYPENAME_TO_CATEGORY: Record<string, string> = {
  BeautySummary: '미용실/뷰티',
  HospitalSummary: '병원/의원',
  PharmacySummary: '약국',
  AccommodationSummary: '숙소',
  AttractionSummary: '관광/명소',
};

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://m.search.naver.com/search.naver?where=m&query=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`네이버 검색 실패 (HTTP ${res.status})`);
  }

  const html = await res.text();
  const state = extractIntegratedSearchState(html);
  if (!state) return [];

  const listKeys = Object.keys(state).filter((k) => {
    if (/AdSummary:/.test(k)) return false;
    return /Summary:/.test(k) || k.startsWith('PlaceDetailBase:');
  });

  const items = listKeys
    .map((k) => state[k])
    .filter((v): v is Record<string, any> => !!v && typeof v === 'object')
    .filter((v) => typeof v.id === 'string' && typeof v.name === 'string');

  return items.slice(0, 5).map((item) => {
    const typename = String(item.__typename ?? '');
    const category =
      String(item.category ?? '') ||
      TYPENAME_TO_CATEGORY[typename] ||
      '';
    return {
      id: String(item.id),
      name: String(item.name),
      category,
      address: String(item.address ?? ''),
      roadAddress: String(item.roadAddress ?? ''),
      phone: item.phone ? String(item.phone) : undefined,
    };
  });
}

export async function fetchPlaceInfo(id: string): Promise<PlaceInfo> {
  if (!/^\d+$/.test(id)) {
    throw new Error('유효하지 않은 장소 ID입니다');
  }

  const url = `https://m.place.naver.com/place/${id}/information`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`장소 정보 불러오기 실패 (HTTP ${res.status})`);
  }

  const html = await res.text();
  const state = extractApolloState(html);
  if (!state) {
    throw new Error('장소 정보를 파싱할 수 없습니다');
  }

  const base = state[`PlaceDetailBase:${id}`];
  const detail = findPlaceDetail(state, id);

  if (!base && !detail) {
    throw new Error('장소 정보를 찾을 수 없습니다');
  }

  const name = String(base?.name ?? detail?.name ?? '');
  const category = String(base?.category ?? detail?.category ?? '');
  const address = String(base?.address ?? '');
  const roadAddress = String(base?.roadAddress ?? '');
  const phone = base?.phone || base?.virtualPhone || undefined;

  return {
    id,
    name,
    category,
    address,
    roadAddress,
    phone,
    hours: extractHours(detail),
    description: extractDescription(detail),
  };
}

function extractApolloState(html: string): Record<string, any> | null {
  const m = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*window\./);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function extractIntegratedSearchState(html: string): Record<string, any> | null {
  const m = html.match(
    /naver\.search\.ext\.nmb\.salt\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*naver\.search\.ext\./,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function findPlaceDetail(state: Record<string, any>, id: string): Record<string, any> | null {
  const root = state.ROOT_QUERY;
  if (!root || typeof root !== 'object') return null;
  const key = Object.keys(root).find(
    (k) => k.startsWith('placeDetail(') && k.includes(`"id":"${id}"`),
  );
  const val = key ? root[key] : null;
  return val && typeof val === 'object' ? val : null;
}

function extractHours(detail: Record<string, any> | null): string | undefined {
  if (!detail) return undefined;
  const key = Object.keys(detail).find((k) => k.startsWith('newBusinessHours('));
  const arr = key ? detail[key] : null;
  if (!Array.isArray(arr) || arr.length === 0) return undefined;

  const lines: string[] = [];
  for (const entry of arr) {
    if (!entry || typeof entry !== 'object') continue;
    const hours = entry.businessHours;
    if (Array.isArray(hours)) {
      for (const h of hours) {
        const day = String(h?.day ?? '').trim();
        const start = h?.businessHours?.start ?? '';
        const end = h?.businessHours?.end ?? '';
        if (!day) continue;
        const time = start && end ? `${start} ~ ${end}` : start || end || '';
        let line = time ? `${day} ${time}` : day;
        if (Array.isArray(h.lastOrderTimes) && h.lastOrderTimes.length > 0) {
          const lo = h.lastOrderTimes
            .map((x: any) => x?.time)
            .filter(Boolean)
            .join(', ');
          if (lo) line += ` (라스트오더 ${lo})`;
        }
        lines.push(line);
      }
    }
    const freeText = String(entry.freeText ?? '').trim();
    if (freeText) lines.push(freeText);
    const closed = String(entry.comingRegularClosedDays ?? '').trim();
    if (closed) lines.push(`정기휴무: ${closed}`);
  }

  return lines.length ? lines.join('\n') : undefined;
}

function extractDescription(detail: Record<string, any> | null): string | undefined {
  if (!detail) return undefined;
  const key = Object.keys(detail).find((k) => k.startsWith('description('));
  const val = key ? detail[key] : null;
  if (typeof val !== 'string') return undefined;
  const cleaned = val.replace(/\r\n/g, '\n').trim();
  return cleaned || undefined;
}

export function formatPlaceInfoForPrompt(info: PlaceInfo): string {
  const lines: string[] = [];
  if (info.name) lines.push(`상호: ${info.name}`);
  if (info.category) lines.push(`카테고리: ${info.category}`);
  const addr = info.roadAddress || info.address;
  if (addr) lines.push(`주소: ${addr}`);
  if (info.phone) lines.push(`전화: ${info.phone}`);
  if (info.hours) lines.push(`영업시간:\n${info.hours}`);
  if (info.description) lines.push(`소개:\n${info.description}`);
  return lines.join('\n');
}
