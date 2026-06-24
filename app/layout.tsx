import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Profit Board — 실전 매매 수익 인증',
  description: '자동매매 전략의 실전 수익을 HMAC 서명으로 검증하는 리더보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-lg tracking-tight">
            📈 Profit Board
          </a>
          <nav className="flex items-center gap-3">
            <a href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
              전략 마켓
            </a>
            <a href="/control" className="text-sm text-gray-400 hover:text-white transition-colors">
              제어판
            </a>
            <a
              href="/register"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-md transition-colors"
            >
              내 수익 등록
            </a>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
