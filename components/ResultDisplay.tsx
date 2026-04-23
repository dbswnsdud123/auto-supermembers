'use client';

import { useState } from 'react';

type Props = {
  text: string;
  loading: boolean;
};

export default function ResultDisplay({ text, loading }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!text && !loading) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">
          생성 결과 {loading && <span className="text-xs text-gray-500">(작성 중...)</span>}
        </h2>
        {text && (
          <button
            type="button"
            onClick={copy}
            className="text-xs bg-black text-white px-3 py-1 rounded"
          >
            {copied ? '복사됨!' : '전체 복사'}
          </button>
        )}
      </div>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
        {text || '생성을 기다리는 중...'}
      </pre>
      {text && (
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-800">
          팁: [사진 N] 마커 위치에 실제 네이버 블로그 에디터에서 해당 순서의 사진을 붙여넣으세요.
        </p>
      )}
    </div>
  );
}
