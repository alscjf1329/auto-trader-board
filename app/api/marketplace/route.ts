import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

const stmts = {
  list: db.prepare(
    'SELECT id, author, name, description, price, downloads, created_at FROM strategies ORDER BY downloads DESC, created_at DESC'
  ),
  insert: db.prepare(
    'INSERT INTO strategies (id, author, name, description, code, price, downloads, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
  ),
}

export async function GET() {
  const rows = stmts.list.all() as unknown as Record<string, unknown>[]
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { author, name, description, code, price } = body

  if (!name?.trim() || !description?.trim() || !code?.trim()) {
    return NextResponse.json({ error: '이름, 설명, 코드는 필수입니다' }, { status: 400 })
  }
  if (name.length > 50 || description.length > 500) {
    return NextResponse.json({ error: '이름 50자, 설명 500자 이내' }, { status: 400 })
  }
  if (!code.includes('BaseStrategy')) {
    return NextResponse.json({ error: 'BaseStrategy를 상속하는 코드만 등록 가능합니다' }, { status: 400 })
  }

  const id = randomBytes(8).toString('hex')
  stmts.insert.run(
    id,
    ((author as string) || '익명').slice(0, 30),
    (name as string).trim(),
    (description as string).trim(),
    (code as string),
    Math.max(0, (price as number) | 0),
    new Date().toISOString(),
  )

  return NextResponse.json({ id }, { status: 201 })
}
