import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '블로그 후기 자동 생성기',
  description: '사진과 장소명만 넣으면 내 말투로 블로그 후기 자동 작성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
