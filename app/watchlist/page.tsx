'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WatchlistCard } from '@/components/watchlist/WatchlistCard'
import { WatchlistBulkImport } from '@/components/watchlist/WatchlistBulkImport'
import { SearchBar } from '@/components/shared/SearchBar'
import type { WatchlistItem } from '@/lib/types'

export default function WatchlistPage() {
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: () => fetch('/api/watchlist').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Stocks you're tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <WatchlistBulkImport />
          <SearchBar />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : (
        <WatchlistCard items={items} onRemove={(id) => remove.mutate(id)} />
      )}
    </div>
  )
}
