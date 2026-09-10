'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PortfolioTable } from '@/components/portfolio/PortfolioTable'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { SearchBar } from '@/components/shared/SearchBar'
import type { Holding, WatchlistItem } from '@/lib/types'

export default function DashboardPage() {
  const qc = useQueryClient()

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ['portfolio'],
    queryFn: () => fetch('/api/portfolio').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: () => fetch('/api/watchlist').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const removeFromWatchlist = useMutation({
    mutationFn: (id: number) => fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const removeHolding = useMutation({
    mutationFn: (id: number) => fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <SearchBar />
      </div>

      {/* Portfolio */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Portfolio</h2>
          <a href="/portfolio" className="text-xs hover:underline" style={{ color: 'var(--blue)' }}>View all →</a>
        </div>
        {holdingsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : holdings.length === 0 ? (
          <div className="rounded-lg p-8 text-center" style={{ border: '1px dashed var(--border)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No holdings yet.</p>
            <a href="/portfolio" className="text-xs" style={{ color: 'var(--blue)' }}>Import from Zerodha →</a>
          </div>
        ) : (
          <PortfolioTable holdings={holdings.slice(0, 8)} onDelete={(id) => removeHolding.mutate(id)} />
        )}
      </section>

      {/* Watchlist */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Watchlist</h2>
          <a href="/watchlist" className="text-xs hover:underline" style={{ color: 'var(--blue)' }}>Manage →</a>
        </div>
        {watchlistLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : (
          <WatchlistCard items={watchlist.slice(0, 10)} onRemove={(id) => removeFromWatchlist.mutate(id)} />
        )}
      </section>
    </div>
  )
}
