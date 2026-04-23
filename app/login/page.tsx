'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setErr('비밀번호가 틀렸어요');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">접속 비밀번호</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-transparent"
          placeholder="비밀번호"
          autoFocus
        />
        {err && <p className="text-sm text-red-500 text-center">{err}</p>}
        <button
          disabled={loading || !password}
          className="w-full bg-black text-white rounded-lg py-3 font-medium disabled:opacity-50"
        >
          {loading ? '확인 중...' : '들어가기'}
        </button>
      </form>
    </div>
  );
}
