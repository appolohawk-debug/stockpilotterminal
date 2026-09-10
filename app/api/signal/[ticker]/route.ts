import { NextResponse } from 'next/server'
import { getHistoricalCloses, getFundamentals } from '@/lib/yahoo'
import { computeTechnicalScore, computeFundamentalScore } from '@/lib/scoring'
import type { SignalResponse } from '@/lib/types'

export async function GET(_: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const decodedTicker = decodeURIComponent(ticker)

  try {
    const [historical, fundamentals] = await Promise.all([
      getHistoricalCloses(decodedTicker, 250),
      getFundamentals(decodedTicker),
    ])

    const technical = computeTechnicalScore(
      historical.closes,
      historical.highs,
      historical.lows,
      historical.volumes
    )

    const fundamental = computeFundamentalScore(fundamentals)

    const response: SignalResponse = {
      ticker: decodedTicker,
      technical,
      fundamental,
      computedAt: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[signal]', err)
    return NextResponse.json({ error: 'Failed to compute signal' }, { status: 500 })
  }
}
