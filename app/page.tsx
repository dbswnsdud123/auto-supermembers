'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhotoUploader from '@/components/PhotoUploader';
import ResultDisplay from '@/components/ResultDisplay';
import type { PhotoItem } from '@/lib/storage';
import type { PlaceCandidate, PlaceInfo } from '@/lib/naver-place';

export default function Home() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceCount, setSourceCount] = useState(0);

  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setSourceCount(Array.isArray(list) ? list.length : 0))
      .catch(() => setSourceCount(0));
  }, []);

  async function searchPlace() {
    const q = placeName.trim();
    if (!q) {
      alert('장소명을 입력해주세요');
      return;
    }
    setSearching(true);
    setCandidates(null);
    try {
      const res = await fetch('/api/place/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list: PlaceCandidate[] = data.candidates || [];
      if (list.length === 0) {
        alert('검색 결과가 없습니다');
        return;
      }
      setCandidates(list);
    } catch (e: any) {
      alert('검색 실패: ' + (e.message || e));
    } finally {
      setSearching(false);
    }
  }

  async function pickCandidate(c: PlaceCandidate) {
    setCandidates(null);
    setPlaceName(c.name);
    setFetchingInfo(true);
    setPlaceInfo(null);
    try {
      const res = await fetch('/api/place/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const info: PlaceInfo = await res.json();
      const merged: PlaceInfo = {
        ...c,
        ...info,
        name: info.name || c.name,
        category: info.category || c.category,
        address: info.address || c.address,
        roadAddress: info.roadAddress || c.roadAddress,
        phone: info.phone || c.phone,
      };
      setPlaceInfo(merged);
    } catch (e: any) {
      alert('장소 정보 불러오기 실패: ' + (e.message || e));
      setPlaceInfo({ ...c });
    } finally {
      setFetchingInfo(false);
    }
  }

  function clearPlace() {
    setPlaceInfo(null);
  }

  async function generate() {
    if (!placeName.trim()) {
      alert('장소명을 입력해주세요');
      return;
    }
    if (photos.length === 0) {
      alert('사진을 1장 이상 업로드해주세요');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: placeName.trim(),
          extraNotes: extraNotes.trim(),
          placeInfo,
          photos: photos.map((p) => ({ dataUrl: p.dataUrl, memo: p.memo })),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `${res.status} ${res.statusText}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setResult(acc);
      }
    } catch (e: any) {
      alert('생성 실패: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    location.href = '/login';
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">블로그 후기 생성기</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/settings" className="text-blue-600 hover:underline">
            말투 예시 ({sourceCount})
          </Link>
          <button type="button" onClick={logout} className="text-gray-500 hover:underline">
            로그아웃
          </button>
        </nav>
      </header>

      {sourceCount === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
          먼저{' '}
          <Link href="/settings" className="font-medium underline">
            말투 예시 관리
          </Link>
          에서 본인의 네이버 블로그 URL을 3개 이상 등록하세요.
        </div>
      )}

      <section className="space-y-2">
        <label className="block text-sm font-medium">장소명</label>
        <div className="flex gap-2">
          <input
            value={placeName}
            onChange={(e) => {
              setPlaceName(e.target.value);
              if (placeInfo) setPlaceInfo(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchPlace();
              }
            }}
            placeholder="예: 성수동 ○○카페"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-transparent"
          />
          <button
            type="button"
            onClick={searchPlace}
            disabled={searching}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50"
          >
            {searching ? '검색 중...' : '네이버 검색'}
          </button>
        </div>

        {candidates && candidates.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
              <span>검색 결과 {candidates.length}개 — 하나 선택</span>
              <button
                type="button"
                onClick={() => setCandidates(null)}
                className="hover:underline"
              >
                닫기
              </button>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickCandidate(c)}
                    className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.category && (
                      <div className="text-xs text-gray-500 mt-0.5">{c.category}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {c.roadAddress || c.address}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fetchingInfo && (
          <div className="text-xs text-gray-500">장소 정보 불러오는 중...</div>
        )}

        {placeInfo && !fetchingInfo && (
          <div className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between items-start gap-2">
              <div className="font-medium">{placeInfo.name}</div>
              <button
                type="button"
                onClick={clearPlace}
                className="text-xs text-gray-500 hover:underline shrink-0"
              >
                제거
              </button>
            </div>
            {placeInfo.category && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {placeInfo.category}
              </div>
            )}
            {(placeInfo.roadAddress || placeInfo.address) && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                📍 {placeInfo.roadAddress || placeInfo.address}
              </div>
            )}
            {placeInfo.phone && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                ☎ {placeInfo.phone}
              </div>
            )}
            {placeInfo.hours && (
              <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">
                🕒 {placeInfo.hours}
              </div>
            )}
            {placeInfo.description && (
              <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-blue-100 dark:border-blue-900/60 mt-2 whitespace-pre-line leading-relaxed">
                {placeInfo.description}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium">추가 메모 (선택)</label>
        <textarea
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          placeholder="예: 여자친구와 방문 / 주차 가능 / 시그니처는 블루베리 라떼"
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-transparent text-sm"
        />
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-medium">
          사진 (순서대로 업로드 · {photos.length}장)
        </label>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </section>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="w-full bg-black text-white rounded-xl py-4 font-medium disabled:opacity-50"
      >
        {loading ? '생성 중...' : '블로그 글 생성'}
      </button>

      <ResultDisplay text={result} loading={loading} />
    </main>
  );
}
