'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type SourceMeta = {
  id: string;
  url: string;
  title: string | null;
  summary: string;
  createdAt: number;
};

export default function Settings() {
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/sources');
      if (res.ok) setSources(await res.json());
    } finally {
      setLoadingList(false);
    }
  }

  async function add() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        setErr(await res.text());
        return;
      }
      setUrl('');
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('정말 삭제하시겠어요?')) return;
    await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">말투 예시 관리</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 생성 페이지로
        </Link>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        본인이 쓴 네이버 블로그 글 URL을 붙여넣으면, AI가 자동으로 글을 읽고 말투 프로필을 추출해 DB에 저장합니다.
        많이 등록할수록 말투가 정확해집니다 (최대 5개까지 생성에 사용).
      </p>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) add();
          }}
          placeholder="https://blog.naver.com/아이디/글번호"
          className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-transparent"
        />
        {err && (
          <p className="text-xs text-red-500 whitespace-pre-wrap">{err}</p>
        )}
        <button
          type="button"
          onClick={add}
          disabled={loading || !url.trim()}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? '분석 중... (10~20초 걸릴 수 있어요)' : '추가 및 분석'}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">저장된 예시 ({sources.length}개)</h2>
        {loadingList ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-gray-500">아직 등록된 예시가 없어요.</p>
        ) : (
          sources.map((s) => (
            <div
              key={s.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {s.title || '(제목 없음)'}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate block"
                  >
                    {s.url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-xs text-red-500 flex-shrink-0"
                >
                  삭제
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {s.summary || '(요약 없음)'}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(s.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
