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

  const db = getDb()
  const insertHolding = db.prepare(`
    INSERT INTO holdings (ticker, shares, avg_cost)
    VALUES (?, ?, ?)
    ON CONFLICT(ticker) DO UPDATE SET shares = excluded.shares, avg_cost = excluded.avg_cost
  `)
  const insertTx = db.prepare(`
    INSERT INTO transactions (ticker, type, shares, price, date, notes)
    VALUES (?, 'BUY', ?, ?, date('now'), 'Imported from Zerodha')
  `)

  const imported: string[] = []
  const skipped: string[] = []

  const importMany = db.transaction(() => {
    for (const row of data) {
      const symbol = row.Tradingsymbol?.trim()
      const shares = Number(row.Quantity)
      const avgCost = Number(row['Average price'])

      if (!symbol || !shares || !avgCost) { skipped.push(symbol ?? 'unknown'); continue }

      const ticker = toNSETicker(symbol)
      insertHolding.run(ticker, shares, avgCost)
      insertTx.run(ticker, shares, avgCost)
      imported.push(ticker)
    }
  })

  importMany()

  return NextResponse.json({ ok: true, imported: imported.length, skipped: skipped.length, tickers: imported })
}
