export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import db from '@/lib/db'

interface Strategy {
  id: string; author: string; name: string; description: string
  code: string; price: number; downloads: number; created_at: string
}

const stmt = db.prepare('SELECT * FROM strategies WHERE id = ?')

export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  const s = stmt.get(params.id) as unknown as Strategy | undefined
  if (!s) notFound()

  const fname = s.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || s.id.slice(0, 12)

  return (
    <>
      <div className="mb-2">
        <a href="/marketplace" className="text-sm text-gray-500 hover:text-gray-300">← 마켓플레이스</a>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="text-sm text-gray-400 mt-1">by {s.author} · {s.created_at.slice(0, 10)} · ↓ {s.downloads.toLocaleString()}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded font-medium ${
          s.price === 0
            ? 'bg-green-900/50 text-green-400 border border-green-800'
            : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
        }`}>
          {s.price === 0 ? '무료' : `₩${s.price.toLocaleString('ko-KR')}`}
        </span>
      </div>

      <p className="text-gray-300 mb-8 whitespace-pre-wrap">{s.description}</p>

      {/* 설치 방법 */}
      <div className="bg-gray-900 border border-indigo-900 rounded-lg p-5 mb-8">
        <h2 className="text-sm font-semibold text-indigo-400 mb-3">설치 방법</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-400 mb-1">① auto-trader 폴더에서 한 줄 설치:</p>
            <code className="block bg-gray-950 rounded px-3 py-2 text-green-400 font-mono text-xs">
              python install_strategy.py {s.id}
            </code>
          </div>
          <div>
            <p className="text-gray-400 mb-1">② settings.yaml 에 전략 이름 설정:</p>
            <code className="block bg-gray-950 rounded px-3 py-2 text-yellow-300 font-mono text-xs whitespace-pre">{`strategy:\n  name: ${fname}`}</code>
          </div>
          <div>
            <p className="text-gray-400 mb-1">③ 또는 수동으로 아래 코드를 저장:</p>
            <code className="block bg-gray-950 rounded px-3 py-2 text-gray-400 font-mono text-xs">
              auto-trader/strategies/{fname}.py
            </code>
          </div>
        </div>
      </div>

      {/* 코드 뷰어 */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3">전략 코드</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-auto">
        <pre className="text-xs text-gray-200 font-mono p-5 whitespace-pre leading-relaxed">{s.code}</pre>
      </div>
    </>
  )
}
