'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhotoUploader from '@/components/PhotoUploader';
import ResultDisplay from '@/components/ResultDisplay';
import type { PhotoItem } from '@/lib/storage';

export default function Home() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setSourceCount(Array.isArray(list) ? list.length : 0))
      .catch(() => setSourceCount(0));
  }, []);

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
        <input
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder="예: 성수동 ○○카페"
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-transparent"
        />
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
