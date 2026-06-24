export const dynamic = 'force-dynamic'

import db from '@/lib/db'

interface Row {
  username: string
  total_profit: number
  avg_pct: number
  wins: number
  total_sells: number
  registered_at: string
}

function getLeaderboard(paperIncluded: boolean): Row[] {
  const paperFilter = paperIncluded ? '' : 'AND t.is_paper = 0'
  const sql = `
    SELECT
      u.username,
      COALESCE(SUM(CASE WHEN t.action='SELL' THEN t.profit_amount ELSE 0 END), 0) AS total_profit,
      COALESCE(AVG(CASE WHEN t.action='SELL' THEN t.profit_pct  END), 0)          AS avg_pct,
      SUM(CASE WHEN t.action='SELL' AND t.profit_pct > 0 THEN 1 ELSE 0 END)       AS wins,
      SUM(CASE WHEN t.action='SELL' THEN 1 ELSE 0 END)                            AS total_sells,
      u.registered_at
    FROM users u
    JOIN trades t ON t.user_id = u.id
    WHERE 1=1 ${paperFilter}
    GROUP BY u.id
    HAVING total_sells > 0
    ORDER BY total_profit DESC
    LIMIT 100
  `
  return db.prepare(sql).all() as unknown as Row[]
}

function fmtProfit(n: number) {
  return `${n >= 0 ? '+' : ''}₩${Math.abs(Math.round(n)).toLocaleString('ko-KR')}`
}

export default function Home({ searchParams }: { searchParams: { paper?: string } }) {
  const showPaper = searchParams.paper === '1'
  const rows = getLeaderboard(showPaper)

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 실전 매매 수익 인증</h1>
          <p className="text-sm text-gray-400 mt-1">
            auto-trader HMAC 서명으로 검증된 거래만 집계됩니다.
          </p>
        </div>
        <a
          href={showPaper ? '/' : '/?paper=1'}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded transition-colors"
        >
          {showPaper ? '실전만 보기' : '모의 포함'}
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500 text-center py-20">
          아직 등록된 수익이 없습니다.{' '}
          <a href="/register" className="text-indigo-400 underline">내 수익을 등록해보세요 →</a>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="pb-3 pr-4 w-10">#</th>
                <th className="pb-3 pr-6">유저</th>
                <th className="pb-3 pr-6 text-right">총수익</th>
                <th className="pb-3 pr-6 text-right">평균수익률</th>
                <th className="pb-3 pr-6 text-right">승률</th>
                <th className="pb-3 pr-6 text-right">매도</th>
                <th className="pb-3 text-right">등록일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                const pColor = r.total_profit >= 0 ? 'text-green-400' : 'text-red-400'
                const wr     = r.total_sells
                  ? `${Math.round((r.wins / r.total_sells) * 100)}%`
                  : '-'
                return (
                  <tr key={r.username} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                    <td className="py-3 pr-4 text-gray-500">{medal}</td>
                    <td className="py-3 pr-6">
                      <a href={`/${r.username}`} className="font-medium hover:text-indigo-400 transition-colors">
                        {r.username}
                      </a>
                    </td>
                    <td className={`py-3 pr-6 text-right font-mono font-semibold ${pColor}`}>
                      {fmtProfit(r.total_profit)}
                    </td>
                    <td className={`py-3 pr-6 text-right font-mono ${r.avg_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {r.avg_pct >= 0 ? '+' : ''}{r.avg_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 pr-6 text-right text-gray-300">
                      {wr} <span className="text-gray-500 text-xs">({r.wins}W {r.total_sells - r.wins}L)</span>
                    </td>
                    <td className="py-3 pr-6 text-right text-gray-400">{r.total_sells}건</td>
                    <td className="py-3 text-right text-gray-500 text-xs">{r.registered_at.slice(0, 10)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-gray-600 text-center">
        ⚠️ is_paper 플래그는 auto-trader 클라이언트가 보고합니다. 실전/모의 자기위조는 기술적으로 가능하나,
        HMAC 서명으로 외부 조작과 소급 입력은 완전 차단됩니다.
      </p>
    </>
  )
}
