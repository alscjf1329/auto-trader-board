import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

const stmts = {
  exists: db.prepare('SELECT id FROM users WHERE username = ?'),
  insert: db.prepare('INSERT INTO users (id, username, secret, registered_at) VALUES (?, ?, ?, ?)'),
}

export async function POST(req: NextRequest) {
  const { username } = await req.json()

  if (!username || !/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return NextResponse.json({ error: '유저명은 영문·숫자·_ 2~20자' }, { status: 400 })
  }
  if (stmts.exists.get(username) as unknown) {
    return NextResponse.json({ error: '이미 사용 중인 유저명입니다' }, { status: 409 })
  }

  const id     = randomBytes(16).toString('hex')
  const secret = randomBytes(32).toString('hex')
  stmts.insert.run(id, username, secret, new Date().toISOString())

  return NextResponse.json({ user_id: id, secret })
}
