'use client'
import Link from 'next/link'
import type { WatchlistItem } from '@/lib/types'

interface Props {
  items: WatchlistItem[]
  onRemove?: (id: number) => void
}

export function WatchlistCard({ items, onRemove }: Props) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <span className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Watchlist</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.length} stocks</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          No stocks in watchlist yet. Search and add stocks using ⌘K.
        </p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b transition-colors" style={{ borderColor: 'var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Link href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">{item.ticker.replace('.NS', '').replace('.BO', '')}</span>
                  {item.name && <span className="text-xs truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>{item.name}</span>}
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">
                    {item.price != null ? `₹${item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </p>
                  {item.changePercent != null && (
                    <p className={`text-xs ${item.changePercent >= 0 ? 'change-up' : 'change-down'}`}>
                      {item.changePercent >= 0 ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
                    </p>
                  )}
                </div>
                {onRemove && (
                  <button onClick={() => onRemove(item.id)} className="text-xs w-6 h-6 flex items-center justify-center rounded hover:opacity-80" style={{ color: 'var(--text-muted)' }}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
