'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [form, setForm] = useState({
    name: '', author: '', description: '', code: '', price: '0',
  })
  const [error, setError]   = useState('')
  const [result, setResult] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(false)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '오류가 발생했습니다'); return }
      setResult(data)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const fname = form.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
    return (
      <div className="max-w-xl">
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-400 mb-2">등록 완료!</h2>
          <p className="text-sm text-gray-300 mb-4">전략 ID: <code className="font-mono text-yellow-300">{result.id}</code></p>
          <p className="text-sm text-gray-400 mb-2">다른 사용자가 설치하는 방법:</p>
          <code className="block bg-gray-950 rounded px-3 py-2 text-green-400 font-mono text-xs">
            python install_strategy.py {result.id}
          </code>
          <p className="text-sm text-gray-400 mt-3 mb-2">또는 settings.yaml 직접 설정:</p>
          <code className="block bg-gray-950 rounded px-3 py-2 text-yellow-300 font-mono text-xs whitespace-pre">{`strategy:\n  name: ${fname}`}</code>
        </div>
        <div className="flex gap-3">
          <a href={`/marketplace/${result.id}`} className="text-sm text-indigo-400 underline">내 전략 페이지 보기</a>
          <a href="/marketplace" className="text-sm text-gray-400 underline">마켓으로 돌아가기</a>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <a href="/marketplace" className="text-sm text-gray-500 hover:text-gray-300">← 마켓플레이스</a>
      </div>
      <h1 className="text-2xl font-bold mb-6">전략 등록</h1>

      <form onSubmit={submit} className="max-w-2xl space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">전략 이름 <span className="text-red-400">*</span></label>
          <input
            value={form.name} onChange={set('name')} required maxLength={50}
            placeholder="예: 이동평균 돌파 전략"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">작성자</label>
          <input
            value={form.author} onChange={set('author')} maxLength={30}
            placeholder="익명"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">설명 <span className="text-red-400">*</span></label>
          <textarea
            value={form.description} onChange={set('description')} required maxLength={500} rows={3}
            placeholder="전략 요약, 사용 조건, 주의사항 등"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            전략 코드 <span className="text-red-400">*</span>
            <span className="ml-2 text-gray-500">— BaseStrategy를 상속해야 합니다</span>
          </label>
          <textarea
            value={form.code} onChange={set('code')} required rows={18}
            placeholder={`from strategies.base import BaseStrategy\n\nclass MyStrategy(BaseStrategy):\n    def get_targets(self) -> list:\n        return ["005930"]\n\n    def should_buy(self, data: dict) -> bool:\n        ...\n\n    def should_sell(self, data: dict, holding: dict) -> bool:\n        ...`}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">가격 (원, 0 = 무료)</label>
          <input
            type="number" value={form.price} onChange={set('price')} min={0}
            className="w-40 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-600">결제 시스템은 준비 중입니다. 현재는 표시만 됩니다.</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? '등록 중…' : '전략 등록'}
        </button>
      </form>
    </>
  )
}
