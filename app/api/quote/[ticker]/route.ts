import { NextResponse } from 'next/server'
import { getQuote } from '@/lib/yahoo'

export async function GET(_: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  try {
    const quote = await getQuote(decodeURIComponent(ticker))
    return NextResponse.json(quote)
  } catch (err) {
    console.error('[quote]', err)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}
