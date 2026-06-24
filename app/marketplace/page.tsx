export const dynamic = 'force-dynamic'

import db from '@/lib/db'

interface Strategy {
  id: string; author: string; name: string; description: string
  price: number; downloads: number; created_at: string
}

const stmt = db.prepare(
  'SELECT id, author, name, description, price, downloads, created_at FROM strategies ORDER BY downloads DESC, created_at DESC'
)

export default function MarketplacePage() {
  const strategies = stmt.all() as unknown as Strategy[]

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">전략 마켓플레이스</h1>
          <p className="text-sm text-gray-400 mt-1">
            커뮤니티가 공유한 auto-trader 전략 코드를 한 줄로 설치하세요.
          </p>
        </div>
        <a
          href="/marketplace/upload"
          className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-md transition-colors"
        >
          전략 등록
        </a>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="mb-4">아직 등록된 전략이 없습니다.</p>
          <a href="/marketplace/upload" className="text-indigo-400 underline">
            첫 번째 전략을 등록해보세요 →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s) => (
            <a
              key={s.id}
              href={`/marketplace/${s.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-indigo-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-semibold text-white truncate">{s.name}</h2>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${
                  s.price === 0
                    ? 'bg-green-900/50 text-green-400 border border-green-800'
                    : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                }`}>
                  {s.price === 0 ? '무료' : `₩${s.price.toLocaleString('ko-KR')}`}
                </span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{s.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>by {s.author}</span>
                <span>↓ {s.downloads.toLocaleString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
