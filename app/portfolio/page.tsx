'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PortfolioTable } from '@/components/portfolio/PortfolioTable'
import { CSVImport } from '@/components/portfolio/CSVImport'
import { SearchBar } from '@/components/shared/SearchBar'
import type { Holding } from '@/lib/types'
import { useState } from 'react'

export default function PortfolioPage() {
  const qc = useQueryClient()
  const [showImport, setShowImport] = useState(false)
  const [addForm, setAddForm] = useState({ ticker: '', shares: '', avgCost: '' })
  const [addError, setAddError] = useState('')

  const { data: holdings = [], isLoading } = useQuery<Holding[]>({
    queryKey: ['portfolio'],
    queryFn: () => fetch('/api/portfolio').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const removeHolding = useMutation({
    mutationFn: (id: number) => fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  })

  const addHolding = useMutation({
    mutationFn: (body: object) => fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portfolio'] }); setAddForm({ ticker: '', shares: '', avgCost: '' }) },
    onError: () => setAddError('Failed to add holding'),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!addForm.ticker || !addForm.shares || !addForm.avgCost) { setAddError('All fields required'); return }
    addHolding.mutate({ ticker: addForm.ticker, shares: Number(addForm.shares), avgCost: Number(addForm.avgCost) })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your NSE/BSE holdings</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
          <button onClick={() => setShowImport(!showImport)} className="text-xs px-3 py-2 rounded transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {showImport ? 'Hide Import' : '↑ Import CSV'}
          </button>
        </div>
      </div>

      {showImport && (
        <CSVImport onImported={() => { qc.invalidateQueries({ queryKey: ['portfolio'] }); setShowImport(false) }} />
      )}

      {/* Manual add form */}
      <form onSubmit={handleAdd} className="flex items-end gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex-1">
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Ticker (e.g. RELIANCE)</label>
          <input value={addForm.ticker} onChange={(e) => setAddForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            className="w-full bg-transparent text-sm px-2 py-1.5 rounded outline-none font-mono"
            style={{ border: '1px solid var(--border)' }} placeholder="INFY" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Shares</label>
          <input type="number" value={addForm.shares} onChange={(e) => setAddForm((f) => ({ ...f, shares: e.target.value }))}
            className="w-24 bg-transparent text-sm px-2 py-1.5 rounded outline-none font-mono"
            style={{ border: '1px solid var(--border)' }} placeholder="10" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Avg Cost (₹)</label>
          <input type="number" value={addForm.avgCost} onChange={(e) => setAddForm((f) => ({ ...f, avgCost: e.target.value }))}
            className="w-28 bg-transparent text-sm px-2 py-1.5 rounded outline-none font-mono"
            style={{ border: '1px solid var(--border)' }} placeholder="1500" />
        </div>
        <button type="submit" className="text-xs px-4 py-2 rounded hover:opacity-80 transition-opacity" style={{ backgroundColor: 'var(--blue)', color: '#fff' }}>
          Add
        </button>
        {addError && <span className="text-xs change-down">{addError}</span>}
      </form>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : (
        <PortfolioTable holdings={holdings} onDelete={(id) => removeHolding.mutate(id)} />
      )}
    </div>
  )
}
