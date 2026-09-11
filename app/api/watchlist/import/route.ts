import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toNSETicker } from '@/lib/yahoo'

export async function POST(req: Request) {
  const db = await getDb()
  const { tickers } = await req.json() as { tickers: string[] }

  if (!Array.isArray(tickers) || !tickers.length) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  const normalized = [...new Set(tickers.map((t) => toNSETicker(t.trim())).filter(Boolean))]

  const statements = normalized.map((ticker) => ({
    sql: `INSERT INTO watchlist (ticker, group_name) VALUES (?, 'Default') ON CONFLICT(ticker) DO NOTHING`,
    args: [ticker] as [string],
  }))

  if (statements.length) await db.batch(statements, 'write')

  return NextResponse.json({ ok: true, added: normalized.length, tickers: normalized })
}
