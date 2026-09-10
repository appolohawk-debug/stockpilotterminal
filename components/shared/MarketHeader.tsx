'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { MarketIndex } from '@/lib/types'

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function MarketHeader() {
  const { data: indices = [] } = useQuery<MarketIndex[]>({
    queryKey: ['market'],
    queryFn: () => fetch('/api/market').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-widest whitespace-nowrap" style={{ color: 'var(--blue)' }}>
          ▶ STKPILOT
        </Link>

        {/* Index pills */}
        <div className="flex items-center gap-6 overflow-x-auto">
          {indices.map((idx) => (
            <div key={idx.ticker} className="flex items-center gap-2 whitespace-nowrap text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{idx.name}</span>
              <span className="font-mono font-semibold">{fmt(idx.price)}</span>
              <span className={idx.changePercent >= 0 ? 'change-up' : 'change-down'}>
                {idx.changePercent >= 0 ? '▲' : '▼'} {Math.abs(idx.changePercent).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
          <Link href="/watchlist" className="hover:text-white transition-colors">Watchlist</Link>
        </nav>

      </div>
    </header>
  )
}
