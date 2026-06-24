'use client'

import { useState, useEffect, useCallback } from 'react'

interface BotState {
  paused: boolean
  mode: string | null
  stop_loss_pct: number | null
  take_profit_pct: number | null
  buy_limit: number | null
  buy_limit_us: number | null
  blacklist: { kr: string[]; us: string[] }
  updated_at: string | null
}

interface Defaults {
  mode: string
  stop_loss_pct: number
  take_profit_pct: number
  buy_limit: number
  buy_limit_us: number
}

interface PnlData {
  date: string
  total_profit: number
  buys: number
  sells: number
  wins: number
}

const api = {
  get:  (path: string) => fetch(`/api/control/${path}`).then(r => r.json()),
  post: (path: string, body?: object) =>
    fetch(`/api/control/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then(r => r.json()),
}

function NumInput({
  label, stateVal, defaultVal, unit, min, max, step = 0.5,
  onSave,
}: {
  label: string; stateVal: number | null; defaultVal: number
  unit: string; min: number; max: number; step?: number
  onSave: (v: number) => Promise<void>
}) {
  const current = stateVal ?? defaultVal
  const [val, setVal]       = useState(String(current))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setVal(String(stateVal ?? defaultVal)) }, [stateVal, defaultVal])

  async function save() {
    setSaving(true)
    await onSave(Number(val))
    setSaving(false)
  }

  const dirty = Number(val) !== current

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-400">{label}</span>
      <input
        type="number" value={val} onChange={e => setVal(e.target.value)}
        min={min} max={max} step={step}
        className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-indigo-500"
      />
      <span className="text-xs text-gray-500">{unit}</span>
      {dirty && (
        <button
          onClick={save} disabled={saving}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1 rounded transition-colors"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      )}
      {stateVal !== null && (
        <span className="text-xs text-yellow-500">봇 설정 (기본 {defaultVal})</span>
      )}
    </div>
  )
}

function BlacklistSection({
  bl, onAdd, onRemove, onClear,
}: {
  bl: { kr: string[]; us: string[] }
  onAdd: (market: 'kr' | 'us', code: string) => Promise<void>
  onRemove: (market: 'kr' | 'us', code: string) => Promise<void>
  onClear: (market?: 'kr' | 'us') => Promise<void>
}) {
  const [krInput, setKrInput] = useState('')
  const [usInput, setUsInput] = useState('')

  async function add(market: 'kr' | 'us', input: string, clear: () => void) {
    const code = input.trim().toUpperCase()
    if (!code) return
    await onAdd(market, code)
    clear()
  }

  return (
    <div className="space-y-3">
      {(['kr', 'us'] as const).map(m => (
        <div key={m}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">{m === 'kr' ? '🇰🇷 한국' : '🇺🇸 미국'}</span>
            <button
              onClick={() => onClear(m)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              전체 초기화
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {bl[m].length === 0 && <span className="text-xs text-gray-600">없음</span>}
            {bl[m].map(code => (
              <span key={code} className="flex items-center gap-1 bg-red-900/30 border border-red-800 rounded px-2 py-0.5 text-xs">
                {code}
                <button onClick={() => onRemove(m, code)} className="text-red-400 hover:text-red-200 ml-1">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={m === 'kr' ? krInput : usInput}
              onChange={e => m === 'kr' ? setKrInput(e.target.value) : setUsInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add(m, m === 'kr' ? krInput : usInput, m === 'kr' ? () => setKrInput('') : () => setUsInput(''))}
              placeholder={m === 'kr' ? '005930' : 'TSLA'}
              className="w-28 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => add(m, m === 'kr' ? krInput : usInput, m === 'kr' ? () => setKrInput('') : () => setUsInput(''))}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded transition-colors"
            >
              + 추가
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ControlPage() {
  const [state,    setState]    = useState<BotState | null>(null)
  const [defaults, setDefaults] = useState<Defaults | null>(null)
  const [pnl,      setPnl]      = useState<PnlData | null>(null)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stateRes, pnlRes] = await Promise.all([
        api.get('state'),
        api.get('pnl'),
      ])
      if (stateRes.error) { setError(stateRes.error); return }
      setState(stateRes.state)
      setDefaults(stateRes.defaults)
      setPnl(pnlRes)
    } catch {
      setError('제어 서버에 연결할 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function act(path: string, body?: object) {
    const res = await api.post(path, body)
    if (res.state) setState(res.state)
    return res
  }

  async function setSetting(key: string, value: number) {
    await act('set', { key, value })
    showToast(`${key} → ${value} 저장됨`)
  }

  if (loading) return <p className="text-gray-500 py-20 text-center">연결 중…</p>

  if (error) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <p className="text-sm text-gray-500 mb-6">
        auto-trader에서 <code className="text-yellow-300">python control.py</code>를 실행하고<br/>
        <code className="text-yellow-300">CONTROL_ENDPOINT</code> 환경변수를 설정했는지 확인하세요.
      </p>
      <button onClick={load} className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded transition-colors">
        다시 시도
      </button>
    </div>
  )

  if (!state || !defaults) return null

  const paused  = state.paused
  const mode    = state.mode ?? defaults.mode
  const pnlColor = (pnl?.total_profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-700 text-white text-sm px-4 py-2 rounded shadow-lg z-50 transition-opacity">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">🎛️ 봇 제어판</h1>
        <button onClick={load} className="text-xs text-gray-500 hover:text-white transition-colors">
          새로고침
        </button>
      </div>

      {/* 오늘 손익 요약 */}
      {pnl && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 flex gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">오늘 실현손익</p>
            <p className={`text-xl font-bold font-mono ${pnlColor}`}>
              {pnl.total_profit >= 0 ? '+' : ''}₩{Math.abs(Math.round(pnl.total_profit)).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">매수</p>
            <p className="text-lg font-mono">{pnl.buys}건</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">매도</p>
            <p className="text-lg font-mono">{pnl.sells}건</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">승률</p>
            <p className="text-lg font-mono">
              {pnl.sells ? `${Math.round((pnl.wins / pnl.sells) * 100)}%` : '-'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 매수 상태 */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">매수 상태</h2>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${paused ? 'text-red-400' : 'text-green-400'}`}>
              <span className={`w-2 h-2 rounded-full ${paused ? 'bg-red-400' : 'bg-green-400'}`} />
              {paused ? '🚫 매수 중단 중' : '✅ 정상 운영 중'}
            </div>
            {paused ? (
              <button
                onClick={async () => { await act('resume'); showToast('매수 재개됨') }}
                className="text-sm bg-green-700 hover:bg-green-600 px-4 py-1.5 rounded transition-colors"
              >
                매수 재개
              </button>
            ) : (
              <button
                onClick={async () => { await act('pause'); showToast('매수 중단됨') }}
                className="text-sm bg-red-800 hover:bg-red-700 px-4 py-1.5 rounded transition-colors"
              >
                매수 중단
              </button>
            )}
          </div>
        </section>

        {/* 모드 */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">실행 모드</h2>
          <div className="flex gap-3">
            {(['brain', 'strategy'] as const).map(m => (
              <button
                key={m}
                onClick={async () => {
                  await act('mode', { mode: m })
                  showToast(`${m} 모드로 전환됨`)
                }}
                className={`px-5 py-2 rounded text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {m === 'brain' ? '🧠 Brain (AI)' : '📐 Strategy (규칙)'}
              </button>
            ))}
          </div>
          {state.mode && state.mode !== defaults.mode && (
            <p className="text-xs text-yellow-500 mt-2">봇 설정 적용 중 (기본: {defaults.mode})</p>
          )}
        </section>

        {/* 수치 설정 */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">수치 설정</h2>
          <div className="space-y-3">
            <NumInput
              label="손절 기준"
              stateVal={state.stop_loss_pct} defaultVal={defaults.stop_loss_pct}
              unit="%" min={-30} max={0} step={0.5}
              onSave={v => setSetting('stop_loss_pct', v)}
            />
            <NumInput
              label="익절 기준"
              stateVal={state.take_profit_pct} defaultVal={defaults.take_profit_pct}
              unit="%" min={0.5} max={100} step={0.5}
              onSave={v => setSetting('take_profit_pct', v)}
            />
            <NumInput
              label="한국 최대 매수"
              stateVal={state.buy_limit} defaultVal={defaults.buy_limit}
              unit="종목" min={1} max={10} step={1}
              onSave={v => setSetting('buy_limit', v)}
            />
            <NumInput
              label="미국 최대 매수"
              stateVal={state.buy_limit_us} defaultVal={defaults.buy_limit_us}
              unit="종목" min={1} max={10} step={1}
              onSave={v => setSetting('buy_limit_us', v)}
            />
          </div>
        </section>

        {/* 블랙리스트 */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">블랙리스트 (매수 제외)</h2>
          <BlacklistSection
            bl={state.blacklist}
            onAdd={async (market, code) => {
              await act('blacklist/add', { market, code })
              showToast(`${code} 블랙리스트 추가됨`)
            }}
            onRemove={async (market, code) => {
              await act('blacklist/remove', { market, code })
              showToast(`${code} 해제됨`)
            }}
            onClear={async (market) => {
              await act('blacklist/clear', market ? { market } : {})
              showToast('블랙리스트 초기화됨')
            }}
          />
        </section>

        {/* 초기화 */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">전체 초기화</h2>
          <p className="text-xs text-gray-500 mb-3">모든 봇 설정을 settings.yaml 기본값으로 복원합니다.</p>
          <button
            onClick={async () => {
              if (!confirm('모든 봇 설정을 초기화하겠습니까?')) return
              await act('reset')
              await load()
              showToast('초기화 완료')
            }}
            className="text-sm bg-gray-800 hover:bg-red-900 border border-gray-700 hover:border-red-700 px-4 py-1.5 rounded transition-colors"
          >
            설정 초기화
          </button>
        </section>

        {state.updated_at && (
          <p className="text-xs text-gray-600 text-right">
            마지막 변경: {state.updated_at.slice(0, 16).replace('T', ' ')}
          </p>
        )}
      </div>
    </div>
  )
}
