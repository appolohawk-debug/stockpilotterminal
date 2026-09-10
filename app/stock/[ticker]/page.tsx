import { getQuote, getChart } from '@/lib/yahoo'
import { StockDetailClient } from './StockDetailClient'

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center px-4">
        <p className="text-2xl font-mono font-bold">{decodedTicker}</p>
        <p className="text-sm" style={{ color: 'var(--red)' }}>Failed to load market data</p>
        <pre className="text-xs max-w-lg whitespace-pre-wrap break-all p-3 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>{msg}</pre>
        <a href="/" className="text-xs underline" style={{ color: 'var(--blue)' }}>← Back to dashboard</a>
      </div>
    )
  }
}

