import { NextRequest, NextResponse } from 'next/server'

const ENDPOINT = process.env.CONTROL_ENDPOINT?.replace(/\/$/, '')
const SECRET   = process.env.CONTROL_SECRET ?? ''

function headers() {
  return { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' }
}

function unavailable() {
  return NextResponse.json(
    { error: 'CONTROL_ENDPOINT가 설정되지 않았습니다. .env에 CONTROL_ENDPOINT를 추가하세요.' },
    { status: 503 }
  )
}

export async function GET(
  _: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!ENDPOINT) return unavailable()
  try {
    const res  = await fetch(`${ENDPOINT}/api/${params.path.join('/')}`, { headers: headers() })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'auto-trader 제어 서버에 연결할 수 없습니다' }, { status: 502 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!ENDPOINT) return unavailable()
  try {
    const body = await req.text()
    const res  = await fetch(`${ENDPOINT}/api/${params.path.join('/')}`, {
      method: 'POST', headers: headers(), body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'auto-trader 제어 서버에 연결할 수 없습니다' }, { status: 502 })
  }
}
