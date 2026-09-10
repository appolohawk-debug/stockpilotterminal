'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

interface SearchResult {
  ticker: string
  name: string
  exchange: string
  type: string
}

export function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ['search', debounced],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(debounced)}`).then((r) => r.json()),
    enabled: debounced.length >= 2,
    staleTime: 10_000,
  })

  function navigate(ticker: string) {
    if (!ticker.trim()) return
    const t = ticker.trim().toUpperCase()
    const resolved = t.startsWith('^') || t.endsWith('.NS') || t.endsWith('.BO') ? t : `${t}.NS`
    router.push(`/stock/${encodeURIComponent(resolved)}`)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim().length >= 1) {
      navigate(query)
    }
  }

  const trimmed = query.trim().toUpperCase()
  const directLabel = trimmed && !trimmed.endsWith('.NS') && !trimmed.endsWith('.BO') && !trimmed.startsWith('^')
    ? `${trimmed}.NS`
    : trimmed

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span>Search stocks</span>
        <kbd className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--border)' }}>⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => { setOpen(false); setQuery('') }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type ticker + ↵  (e.g. RELIANCE, TCS, INFY)"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text)' }}
              />
              {isFetching && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.ticker}
                  onClick={() => navigate(r.ticker)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <span className="text-sm font-mono font-semibold">{r.ticker}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.name}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>{r.type}</span>
                </button>
              ))}

              {/* Direct-navigation row — always shown when something is typed */}
              {trimmed.length >= 1 && (
                <button
                  onClick={() => navigate(query)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <span className="text-sm font-mono font-semibold">{directLabel}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Go directly to this ticker</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' }}>↵</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
