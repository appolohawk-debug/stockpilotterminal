import { NextResponse } from 'next/server'
import { getChart } from '@/lib/yahoo'

export const runtime = 'edge'

export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const url = new URL(req.url)
  const range = (url.searchParams.get('range') ?? '6mo') as Parameters<typeof getChart>[1]
  const interval = (url.searchParams.get('interval') ?? '1d') as Parameters<typeof getChart>[2]

  try {
    const candles = await getChart(decodeURIComponent(ticker), range, interval)
    return NextResponse.json(candles)
  } catch (err) {
    console.error('[chart]', err)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 })
  }
}
