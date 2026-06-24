import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

const MAX_AGE_MS    = 5 * 60 * 1000
const MAX_FUTURE_MS = 60 * 1000
const RATE_LIMIT    = 10

// ponytail: in-memory rate limit, resets on restart
const rateMap = new Map<string, { n: number; reset: number }>()
function checkRate(userId: string): boolean {
  const now = Date.now()
  const e   = rateMap.get(userId)
  if (!e || now > e.reset) { rateMap.set(userId, { n: 1, reset: now + 60_000 }); return true }
  if (e.n >= RATE_LIMIT)   return false
  e.n++
  return true
}

const stmts = {
  getUser:      db.prepare('SELECT secret FROM users WHERE id = ?'),
  nonceExists:  db.prepare('SELECT id FROM trades WHERE nonce = ?'),
  insertTrade:  db.prepare(`
    INSERT INTO trades
      (user_id, nonce, action, code, name, price, qty, profit_pct, profit_amount, mode, is_paper, traded_at, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
}

export async function POST(req: NextRequest) {
  const raw = await req.text()

  let body: {
    user_id: string; nonce: string; timestamp: string
    trade: {
      action: string; code: string; name: string
      price: number; qty: number
      profit_pct: number; profit_amount: number
      mode: string; is_paper: boolean
    }
  }
  try { body = JSON.parse(raw) }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { user_id, nonce, timestamp, trade } = body
  if (!user_id || !nonce || !timestamp || !trade?.action) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  // 소급 입력 차단 — 타임스탬프가 5분 이상 지났거나 1분 이상 미래면 거절
  const age = Date.now() - new Date(timestamp).getTime()
  if (age > MAX_AGE_MS || age < -MAX_FUTURE_MS) {
    return NextResponse.json({ error: 'timestamp out of range' }, { status: 400 })
  }

  const user = stmts.getUser.get(user_id) as unknown as { secret: string } | undefined
  if (!user) return NextResponse.json({ error: 'unknown user' }, { status: 401 })

  // HMAC-SHA256 constant-time 비교
  const sig      = req.headers.get('x-signature') ?? ''
  const expected = createHmac('sha256', user.secret).update(raw).digest('hex')
  let valid = false
  try { valid = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex')) }
  catch { /* 길이 불일치 → false */ }
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

  if (!checkRate(user_id)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 })
  }

  // 논스 중복 → replay attack 차단
  if (stmts.nonceExists.get(nonce) as unknown) {
    return NextResponse.json({ error: 'duplicate nonce' }, { status: 409 })
  }

  stmts.insertTrade.run(
    user_id, nonce,
    trade.action, trade.code, trade.name,
    trade.price, trade.qty,
    trade.profit_pct ?? 0, trade.profit_amount ?? 0,
    trade.mode ?? '',
    trade.is_paper ? 1 : 0,
    timestamp,
    new Date().toISOString(),
  )

  return NextResponse.json({ ok: true })
}
