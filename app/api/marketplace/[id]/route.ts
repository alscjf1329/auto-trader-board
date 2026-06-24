import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

const stmts = {
  get:  db.prepare('SELECT * FROM strategies WHERE id = ?'),
  incr: db.prepare('UPDATE strategies SET downloads = downloads + 1 WHERE id = ?'),
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const row = stmts.get.get(params.id) as unknown as Record<string, unknown> | undefined
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(row)
}

// ponytail: POST = download counter increment (called by install_strategy.py)
export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  stmts.incr.run(params.id)
  return NextResponse.json({ ok: true })
}
