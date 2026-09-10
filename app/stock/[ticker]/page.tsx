import { getQuote, getChart } from '@/lib/yahoo'
import { StockDetailClient } from './StockDetailClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ ticker: string }>
}

export default async function StockDetailPage({ params }: Props) {
  const { ticker } = await params
  const decodedTicker = decodeURIComponent(ticker)

  try {
    const [quote, candles] = await Promise.all([
      getQuote(decodedTicker),
      getChart(decodedTicker, '6mo', '1d'),
    ])

    return <StockDetailClient ticker={decodedTicker} quote={quote} initialCandles={candles} />
  } catch {
    notFound()
  }
}
