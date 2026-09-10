'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StockChart } from '@/components/charts/StockChart'
import { SignalBadge } from '@/components/shared/SignalBadge'
import type { Quote, OHLCVCandle, SignalResponse } from '@/lib/types'

interface Props {
  ticker: string
  quote: Quote
  initialCandles: OHLCVCandle[]
}

function fmt(n: number | null | undefined, prefix = '₹') {
  if (n == null) return '—'
  return `${prefix}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function fmtLarge(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  return fmt(n)
}

export function StockDetailClient({ ticker, quote, initialCandles }: Props) {
  const qc = useQueryClient()
  const symbol = ticker.replace('.NS', '').replace('.BO', '')

  const { data: signal, isLoading: signalLoading } = useQuery<SignalResponse>({
    queryKey: ['signal', ticker],
    queryFn: () => fetch(`/api/signal/${encodeURIComponent(ticker)}`).then((r) => r.json()),
    staleTime: 15 * 60_000,
  })

  const addToWatchlist = useMutation({
    mutationFn: () => fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const fundamentals = [
    { label: 'Market Cap', value: fmtLarge(quote.marketCap) },
    { label: 'P/E Ratio', value: quote.pe?.toFixed(2) ?? '—' },
    { label: 'EPS (TTM)', value: fmt(quote.eps) },
    { label: 'Div Yield', value: quote.dividendYield != null ? `${(quote.dividendYield * 100).toFixed(2)}%` : '—' },
    { label: 'Beta', value: quote.beta?.toFixed(2) ?? '—' },
    { label: '52W High', value: fmt(quote.fiftyTwoWeekHigh) },
    { label: '52W Low', value: fmt(quote.fiftyTwoWeekLow) },
    { label: 'Volume', value: quote.volume?.toLocaleString('en-IN') ?? '—' },
  ]

  const rangeWidth = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow
  const rangePct = rangeWidth > 0 ? ((quote.price - quote.fiftyTwoWeekLow) / rangeWidth) * 100 : 50

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono font-bold">{symbol}</h1>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>NSE</span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: quote.marketState === 'REGULAR' ? 'rgba(0,200,122,0.15)' : 'rgba(107,107,128,0.2)', color: quote.marketState === 'REGULAR' ? 'var(--green)' : 'var(--text-muted)' }}>
              {quote.marketState === 'REGULAR' ? '● LIVE' : '○ CLOSED'}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{quote.name}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold">{fmt(quote.price)}</p>
          <p className={`text-sm font-mono ${quote.changePercent >= 0 ? 'change-up' : 'change-down'}`}>
            {quote.changePercent >= 0 ? '▲' : '▼'} {fmt(quote.change, '')} ({Math.abs(quote.changePercent).toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => addToWatchlist.mutate()} className="text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          + Watchlist
        </button>
        <a href="/portfolio" className="text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          + Portfolio
        </a>
      </div>

      {/* Chart */}
      <StockChart ticker={ticker} candles={initialCandles} />

      {/* Signal scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {signalLoading ? (
          <>
            <div className="rounded-lg p-4 animate-pulse h-32" style={{ backgroundColor: 'var(--surface-2)' }} />
            <div className="rounded-lg p-4 animate-pulse h-32" style={{ backgroundColor: 'var(--surface-2)' }} />
          </>
        ) : signal ? (
          <>
            <SignalBadge label={signal.technical.label} score={signal.technical.score} summary={signal.technical.summary} type="Technical" />
            <SignalBadge label={signal.fundamental.label} score={signal.fundamental.score} summary={signal.fundamental.summary} type="Fundamental" />
          </>
        ) : null}
      </div>

      {/* 52W Range */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>52-Week Range</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono">{fmt(quote.fiftyTwoWeekLow)}</span>
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, rangePct))}%`, backgroundColor: 'var(--blue)' }} />
          </div>
          <span className="text-xs font-mono">{fmt(quote.fiftyTwoWeekHigh)}</span>
        </div>
        <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>Current: {fmt(quote.price)} ({rangePct.toFixed(1)}% of range)</p>
      </div>

      {/* Fundamentals grid */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs mb-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Key Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {fundamentals.map((f) => (
            <div key={f.label}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
              <p className="font-mono text-sm font-semibold mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
