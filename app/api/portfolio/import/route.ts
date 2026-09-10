import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { toNSETicker } from '@/lib/yahoo'
import Papa from 'papaparse'
import type { ZerodhaHolding } from '@/lib/types'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const { data, errors } = Papa.parse<ZerodhaHolding>(text, { header: true, skipEmptyLines: true })

  if (errors.length && !data.length) {
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 })
  }

  const db = await getDb()
  const imported: string[] = []
  const skipped: string[] = []

  const statements = []
  for (const row of data) {
    const symbol = row.Tradingsymbol?.trim()
    const shares = Number(row.Quantity)
    const avgCost = Number(row['Average price'])

    if (!symbol || !shares || !avgCost) { skipped.push(symbol ?? 'unknown'); continue }

    const ticker = toNSETicker(symbol)
    statements.push({
      sql: `INSERT INTO holdings (ticker, shares, avg_cost)
            VALUES (?, ?, ?)
            ON CONFLICT(ticker) DO UPDATE SET shares = excluded.shares, avg_cost = excluded.avg_cost`,
      args: [ticker, shares, avgCost] as [string, number, number],
    })
    statements.push({
      sql: `INSERT INTO transactions (ticker, type, shares, price, date, notes) VALUES (?, 'BUY', ?, ?, date('now'), 'Imported from Zerodha')`,
      args: [ticker, shares, avgCost] as [string, number, number],
    })
    imported.push(ticker)
  }

  if (statements.length) await db.batch(statements, 'write')

  return NextResponse.json({ ok: true, imported: imported.length, skipped: skipped.length, tickers: imported })
}
