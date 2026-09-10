import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getQuotes, toNSETicker } from '@/lib/yahoo'
import type { Holding } from '@/lib/types'
import Papa from 'papaparse'

export async function GET() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM holdings ORDER BY ticker').all() as {
    id: number; ticker: string; shares: number; avg_cost: number; created_at: string
  }[]

  if (!rows.length) return NextResponse.json([])

  const quotes = await getQuotes(rows.map((r) => r.ticker))
  const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]))

  const holdings: Holding[] = rows.map((r) => {
    const q = quoteMap[r.ticker]
    const currentPrice = q?.price ?? 0
    const currentValue = currentPrice * r.shares
    const costBasis = r.avg_cost * r.shares
    return {
      id: r.id,
      ticker: r.ticker,
      shares: r.shares,
      avgCost: r.avg_cost,
      createdAt: r.created_at,
      name: q?.name,
      currentPrice,
      currentValue,
      unrealizedPnl: currentValue - costBasis,
      unrealizedPnlPct: costBasis ? ((currentValue - costBasis) / costBasis) * 100 : 0,
      dayChange: q?.change,
      dayChangePct: q?.changePercent,
    }
  })

  return NextResponse.json(holdings)
}

export async function POST(req: Request) {
  const db = getDb()
  const body = await req.json() as { ticker: string; shares: number; avgCost: number }
  const ticker = toNSETicker(body.ticker)

  db.prepare(`
    INSERT INTO holdings (ticker, shares, avg_cost)
    VALUES (?, ?, ?)
    ON CONFLICT(ticker) DO UPDATE SET shares = excluded.shares, avg_cost = excluded.avg_cost
  `).run(ticker, body.shares, body.avgCost)

  db.prepare(`
    INSERT INTO transactions (ticker, type, shares, price, date)
    VALUES (?, 'BUY', ?, ?, date('now'))
  `).run(ticker, body.shares, body.avgCost)

  return NextResponse.json({ ok: true, ticker })
}

export async function DELETE(req: Request) {
  const db = getDb()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  db.prepare('DELETE FROM holdings WHERE id = ?').run(Number(id))
  return NextResponse.json({ ok: true })
}
