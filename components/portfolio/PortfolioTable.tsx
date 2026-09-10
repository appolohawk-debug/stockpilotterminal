'use client'
import Link from 'next/link'
import type { Holding } from '@/lib/types'

interface Props {
  holdings: Holding[]
  onDelete?: (id: number) => void
}

function fmt(n: number | undefined, prefix = '₹') {
  if (n == null) return '—'
  return `${prefix}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function pct(n: number | undefined) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function PortfolioTable({ holdings, onDelete }: Props) {
  const totalValue = holdings.reduce((s, h) => s + (h.currentValue ?? 0), 0)
  const totalPnl = holdings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0)
  const totalCost = holdings.reduce((s, h) => s + h.avgCost * h.shares, 0)
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0

  return (
    <div>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Portfolio Value', value: fmt(totalValue), sub: null },
          { label: 'Unrealized P&L', value: fmt(totalPnl), sub: pct(totalPnlPct), up: totalPnl >= 0 },
          { label: 'Positions', value: String(holdings.length), sub: null },
        ].map((card) => (
          <div key={card.label} className="rounded-lg p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <p className="text-2xl font-mono font-bold">{card.value}</p>
            {card.sub && <p className={`text-sm mt-0.5 ${card.up ? 'change-up' : 'change-down'}`}>{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Avg Cost</th>
              <th className="text-right">LTP</th>
              <th className="text-right">Value</th>
              <th className="text-right">P&L</th>
              <th className="text-right">Day</th>
              {onDelete && <th />}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.id}>
                <td>
                  <Link href={`/stock/${encodeURIComponent(h.ticker)}`} className="hover:underline">
                    <span className="font-mono font-semibold text-sm">{h.ticker.replace('.NS', '').replace('.BO', '')}</span>
                    {h.name && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.name}</p>}
                  </Link>
                </td>
                <td className="text-right font-mono text-sm">{h.shares}</td>
                <td className="text-right font-mono text-sm">{fmt(h.avgCost)}</td>
                <td className="text-right font-mono text-sm">{fmt(h.currentPrice)}</td>
                <td className="text-right font-mono text-sm">{fmt(h.currentValue)}</td>
                <td className={`text-right font-mono text-sm ${(h.unrealizedPnl ?? 0) >= 0 ? 'change-up' : 'change-down'}`}>
                  <div>{fmt(h.unrealizedPnl)}</div>
                  <div className="text-xs">{pct(h.unrealizedPnlPct)}</div>
                </td>
                <td className={`text-right font-mono text-sm ${(h.dayChangePct ?? 0) >= 0 ? 'change-up' : 'change-down'}`}>
                  {pct(h.dayChangePct)}
                </td>
                {onDelete && (
                  <td className="text-right">
                    <button onClick={() => onDelete(h.id)} className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity" style={{ color: 'var(--red)', backgroundColor: 'rgba(245,66,75,0.1)' }}>×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
