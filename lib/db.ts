import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null
let _initialized = false

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? 'file:./data/portfolio.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return _client
}

export async function getDb(): Promise<Client> {
  const db = getClient()
  if (!_initialized) {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS holdings (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker     TEXT NOT NULL UNIQUE,
        shares     REAL NOT NULL,
        avg_cost   REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker     TEXT NOT NULL,
        type       TEXT NOT NULL,
        shares     REAL NOT NULL,
        price      REAL NOT NULL,
        date       TEXT NOT NULL,
        notes      TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS watchlist (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker     TEXT NOT NULL UNIQUE,
        group_name TEXT DEFAULT 'Default',
        added_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      'CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker)',
    ], 'write')
    _initialized = true
  }
  return db
}
