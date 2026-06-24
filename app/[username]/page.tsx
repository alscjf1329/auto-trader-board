export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import db from '@/lib/db'

interface Trade {
  id: number; action: string; code: string; name: string
  price: number; qty: number; profit_pct: number; profit_amount: number
  mode: string; is_paper: number; traded_at: string
}
interface Stats {
  total_profit: number; avg_pct: number
  wins: number; total_sells: number
}

const stmts = {
  user:   db.prepare('SELECT id, username, registered_at FROM users WHERE username = ?'),
  stats:  db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN action='SELL' THEN profit_amount ELSE 0 END), 0) AS total_profit,
      COALESCE(AVG(CASE WHEN action='SELL' THEN profit_pct END), 0)           AS avg_pct,
      SUM(CASE WHEN action='SELL' AND profit_pct > 0 THEN 1 ELSE 0 END)       AS wins,
      SUM(CASE WHEN action='SELL' THEN 1 ELSE 0 END)                          AS total_sells
    FROM trades WHERE user_id = ? AND is_paper = 0
  `),
  trades: db.prepare(`
    SELECT id, action, code, name, price, qty, profit_pct, profit_amount, mode, is_paper, traded_at
    FROM trades WHERE user_id = ?
    ORDER BY traded_at DESC LIMIT 200
  `),
}

export default function UserPage({ params }: { params: { username: string } }) {
  const user = stmts.user.get(params.username) as unknown as
    { id: string; username: string; registered_at: string } | undefined
  if (!user) notFound()

  const stats  = stmts.stats.get(user.id)  as unknown as Stats
  const trades = stmts.trades.all(user.id) as unknown as Trade[]

  const winRate = stats.total_sells
    ? Math.round((stats.wins / stats.total_sells) * 100)
    : 0

  const statCards = [
    {
      label: '총수익 (실전)',
      value: `${stats.total_profit >= 0 ? '+' : ''}₩${Math.abs(Math.round(stats.total_profit)).toLocaleString('ko-KR')}`,
      color: stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '평균수익률',
      value: `${stats.avg_pct >= 0 ? '+' : ''}${stats.avg_pct.toFixed(2)}%`,
      color: stats.avg_pct >= 0 ? 'text-green-400' : 'text-red-400',
    },
    { label: '승률 (실전)', value: `${winRate}%`,          color: 'text-gray-100' },
    { label: '매도건수',   value: `${stats.total_sells}건`, color: 'text-gray-100' },
  ]

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded">
            ✓ HMAC 인증
          </span>
        </div>
        <p className="text-sm text-gray-500">등록일 {user.registered_at.slice(0, 10)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-gray-400 mb-3">거래 내역 (최근 200건)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4">시각</th>
              <th className="pb-2 pr-4">종목</th>
              <th className="pb-2 pr-4">구분</th>
              <th className="pb-2 pr-4 text-right">수량</th>
              <th className="pb-2 pr-4 text-right">단가</th>
              <th className="pb-2 pr-4 text-right">손익%</th>
              <th className="pb-2 pr-4 text-right">손익(₩)</th>
              <th className="pb-2 text-right">전략</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const sell  = t.action === 'SELL'
              const pColor = t.profit_pct > 0 ? 'text-green-400' : t.profit_pct < 0 ? 'text-red-400' : 'text-gray-400'
              return (
                <tr key={t.id} className="border-b border-gray-800/40 hover:bg-gray-900/40">
                  <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                    {t.traded_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-medium">{t.name}</span>{' '}
                    <span className="text-gray-500 text-xs">{t.code}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-semibold ${sell ? 'text-red-400' : 'text-green-400'}`}>
                      {t.action}
                    </span>
                    {t.is_paper ? <span className="ml-1 text-xs text-yellow-600">모의</span> : null}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">{t.qty}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-300">
                    {t.price.toLocaleString('ko-KR')}
                  </td>
                  <td className={`py-2 pr-4 text-right font-mono ${sell ? pColor : 'text-gray-600'}`}>
                    {sell ? `${t.profit_pct >= 0 ? '+' : ''}${t.profit_pct.toFixed(2)}%` : '-'}
                  </td>
                  <td className={`py-2 pr-4 text-right font-mono ${sell ? pColor : 'text-gray-600'}`}>
                    {sell
                      ? `${t.profit_amount >= 0 ? '+' : ''}${Math.round(t.profit_amount).toLocaleString('ko-KR')}`
                      : '-'}
                  </td>
                  <td className="py-2 text-right text-gray-500 text-xs">{t.mode || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
