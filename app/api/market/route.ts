import { NextResponse } from 'next/server'
import { getQuotes } from '@/lib/yahoo'

const INDICES = [
  { name: 'NIFTY 50', ticker: '^NSEI' },
  { name: 'SENSEX', ticker: '^BSESN' },
  { name: 'NIFTY BANK', ticker: '^NSEBANK' },
]

export const revalidate = 30

export async function GET() {
  try {
    const quotes = await getQuotes(INDICES.map((i) => i.ticker))
    const result = INDICES.map((idx) => {
      const q = quotes.find((q) => q.ticker === idx.ticker)
      return {
        name: idx.name,
        ticker: idx.ticker,
        price: q?.price ?? 0,
        change: q?.change ?? 0,
        changePercent: q?.changePercent ?? 0,
      }
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[market]', err)
    return NextResponse.json([], { status: 200 })
  }
}
