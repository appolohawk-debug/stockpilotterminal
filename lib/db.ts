import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'portfolio.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker     TEXT NOT NULL UNIQUE,
      shares     REAL NOT NULL,
      avg_cost   REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker     TEXT NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('BUY','SELL')),
      shares     REAL NOT NULL,
      price      REAL NOT NULL,
      date       TEXT NOT NULL,
      notes      TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker     TEXT NOT NULL UNIQUE,
      group_name TEXT DEFAULT 'Default',
      added_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
    CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);
  `)
}
