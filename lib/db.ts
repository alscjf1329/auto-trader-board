import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'trades.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

// ponytail: singleton across Next.js hot-reloads
const g = global as typeof globalThis & { _db?: InstanceType<typeof DatabaseSync> }
if (!g._db) {
  g._db = new DatabaseSync(DB_PATH)
  g._db.exec(`PRAGMA journal_mode = WAL`)
  g._db.exec(`PRAGMA busy_timeout = 5000`)
  g._db.exec(`PRAGMA foreign_keys = ON`)
  g._db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      username     TEXT UNIQUE NOT NULL,
      secret       TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trades (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        TEXT    NOT NULL REFERENCES users(id),
      nonce          TEXT    UNIQUE NOT NULL,
      action         TEXT    NOT NULL,
      code           TEXT    NOT NULL,
      name           TEXT    NOT NULL,
      price          REAL    NOT NULL,
      qty            INTEGER NOT NULL,
      profit_pct     REAL    DEFAULT 0,
      profit_amount  REAL    DEFAULT 0,
      mode           TEXT    DEFAULT '',
      is_paper       INTEGER NOT NULL,
      traded_at      TEXT    NOT NULL,
      received_at    TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_trades_user  ON trades(user_id);
    CREATE INDEX IF NOT EXISTS idx_trades_nonce ON trades(nonce);

    CREATE TABLE IF NOT EXISTS strategies (
      id          TEXT PRIMARY KEY,
      author      TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      code        TEXT NOT NULL,
      price       INTEGER DEFAULT 0,
      downloads   INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_strategies_author ON strategies(author);
  `)
}

export default g._db!
