'use client'

import { useState } from 'react'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<{ user_id: string; secret: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setResult(data)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">✅ 등록 완료</h1>
        <p className="text-gray-400 text-sm mb-6">
          아래 값을 <code className="bg-gray-800 px-1 rounded">auto-trader/.env</code> 에 추가하세요.
          <strong className="text-yellow-400"> 시크릿은 지금만 표시됩니다 — 반드시 복사하세요.</strong>
        </p>
        {[
          { key: 'VERIFY_ENDPOINT', val: window.location.origin },
          { key: 'VERIFY_USER_ID', val: result.user_id },
          { key: 'VERIFY_SECRET',  val: result.secret },
        ].map(({ key, val }) => (
          <div key={key} className="mb-3">
            <p className="text-xs text-gray-500 mb-1">{key}</p>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
              <code className="flex-1 text-sm break-all font-mono text-gray-200">{val}</code>
              <button
                onClick={() => copy(val, key)}
                className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0"
              >
                {copied === key ? '✓ 복사됨' : '복사'}
              </button>
            </div>
          </div>
        ))}
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
          <p className="font-semibold text-gray-300 mb-2">📋 .env 에 붙여넣을 내용</p>
          <pre className="text-xs text-green-400 leading-relaxed whitespace-pre-wrap">
{`VERIFY_ENDPOINT=${window.location.origin}
VERIFY_USER_ID=${result.user_id}
VERIFY_SECRET=${result.secret}`}
          </pre>
          <button
            onClick={() => copy(
              `VERIFY_ENDPOINT=${window.location.origin}\nVERIFY_USER_ID=${result.user_id}\nVERIFY_SECRET=${result.secret}`,
              'all'
            )}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
          >
            {copied === 'all' ? '✓ 전체 복사됨' : '전체 복사'}
          </button>
        </div>
        <a href="/" className="block mt-6 text-center text-sm text-gray-500 hover:text-gray-300">
          ← 리더보드로
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">수익 인증 등록</h1>
      <p className="text-gray-400 text-sm mb-8">
        등록 후 발급된 시크릿을 auto-trader <code className="bg-gray-800 px-1 rounded">.env</code>에
        추가하면 매 거래가 HMAC 서명으로 인증되어 리더보드에 반영됩니다.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">유저명</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="영문·숫자·_  2~20자"
            pattern="[a-zA-Z0-9_]{2,20}"
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? '처리 중...' : '등록 및 시크릿 발급'}
        </button>
      </form>
      <ul className="mt-8 space-y-2 text-xs text-gray-500">
        <li>✓ HMAC-SHA256 서명 — 외부 위조 및 소급 입력 차단</li>
        <li>✓ 논스 중복 차단 — 동일 거래 재전송 방지</li>
        <li>✓ 타임스탬프 검증 — 과거 거래 소급 등록 불가 (±5분)</li>
        <li>⚠ 실전/모의 구분은 auto-trader 클라이언트가 보고 (자기위조 가능)</li>
      </ul>
    </div>
  )
}
