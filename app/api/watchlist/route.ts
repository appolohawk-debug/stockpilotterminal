import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getQuotes, toNSETicker } from '@/lib/yahoo'
import type { WatchlistItem } from '@/lib/types'

export async function GET() {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM watchlist ORDER BY added_at DESC')
  const rows = result.rows as unknown as {
    id: number; ticker: string; group_name: string; added_at: string
  }[]

  if (!rows.length) return NextResponse.json([])

  const quotes = await getQuotes(rows.map((r) => r.ticker))
  const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]))

  const items: WatchlistItem[] = rows.map((r) => {
    const q = quoteMap[r.ticker]
    return {
      id: r.id,
      ticker: r.ticker,
      groupName: r.group_name,
      addedAt: r.added_at,
      name: q?.name,
      price: q?.price,
      change: q?.change,
      changePercent: q?.changePercent,
    }
  })

  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const db = await getDb()
  const body = await req.json() as { ticker: string; groupName?: string }
  const ticker = toNSETicker(body.ticker)

  await db.execute({
    sql: `INSERT INTO watchlist (ticker, group_name) VALUES (?, ?) ON CONFLICT(ticker) DO NOTHING`,
    args: [ticker, body.groupName ?? 'Default'],
  })

  return NextResponse.json({ ok: true, ticker })
}

export async function DELETE(req: Request) {
  const db = await getDb()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.execute({ sql: 'DELETE FROM watchlist WHERE id = ?', args: [Number(id)] })
  return NextResponse.json({ ok: true })
}
