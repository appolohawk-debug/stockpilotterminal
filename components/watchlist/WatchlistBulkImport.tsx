'use client'
import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Papa from 'papaparse'

interface ZerodhaRow { Tradingsymbol?: string }

export function WatchlistBulkImport() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ added: number; tickers: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  function parseCsv(raw: string): string[] {
    const { data } = Papa.parse<ZerodhaRow>(raw, { header: true, skipEmptyLines: true })
    return data.map((r) => r.Tradingsymbol?.trim() ?? '').filter(Boolean)
  }

  function parseText(raw: string): string[] {
    return raw
      .split(/[\n,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length >= 1)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    const tickers = parseCsv(content)
    setText((prev) => [...new Set([...parseText(prev), ...tickers])].join('\n'))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    const tickers = parseText(text)
    if (!tickers.length) return
    setLoading(true)
    const res = await fetch('/api/watchlist/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
    })
    const data = await res.json()
    setResult(data)
    qc.invalidateQueries({ queryKey: ['watchlist'] })
    setText('')
    setLoading(false)
  }

  function close() { setOpen(false); setResult(null); setText('') }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
      >
        Bulk Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={close}>
          <div className="w-full max-w-md rounded-xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">Bulk Import to Watchlist</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Upload Zerodha Holdings CSV or paste tickers</p>
              </div>
              <button onClick={close} style={{ color: 'var(--text-muted)' }}>×</button>
            </div>

            {result ? (
              <div className="space-y-3">
                <p className="text-sm">Added <strong>{result.added}</strong> stocks to watchlist</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{result.tickers.join(', ')}</p>
                <button onClick={close} className="w-full py-2 rounded text-sm font-medium" style={{ backgroundColor: 'var(--blue)', color: '#fff' }}>Done</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Zerodha Holdings CSV (optional)
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-xs transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <span>📂 Choose file…</span>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                  </label>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Zerodha Console → Portfolio → Download CSV</p>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Tickers — one per line or comma-separated
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={'RELIANCE\nTCS\nINFY\nWIPRO'}
                    rows={6}
                    className="w-full rounded p-3 text-xs font-mono resize-none outline-none"
                    style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={close} className="flex-1 py-2 rounded text-sm" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
                  <button
                    onClick={submit}
                    disabled={loading || !parseText(text).length}
                    className="flex-1 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--blue)', color: '#fff' }}
                  >
                    {loading ? 'Adding…' : `Add ${parseText(text).length || ''} stocks`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
