'use client'
import { useRef, useState } from 'react'

interface Props {
  onImported: () => void
}

export function CSVImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFile(file: File) {
    setStatus('loading')
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/portfolio/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus('success')
      setMessage(`Imported ${data.imported} holdings${data.skipped ? ` (${data.skipped} skipped)` : ''}`)
      onImported()
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
  }

  return (
    <div className="rounded-lg p-6 text-center" style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--surface)' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
    >
      {status === 'idle' && (
        <>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Drop Zerodha Holdings CSV here</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>console.zerodha.com → Portfolio → Holdings → Download CSV</p>
          <button onClick={() => inputRef.current?.click()} className="text-xs px-4 py-2 rounded transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--blue)', color: '#fff' }}>
            Choose file
          </button>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </>
      )}
      {status === 'loading' && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Importing...</p>}
      {status === 'success' && (
        <div>
          <p className="text-sm change-up mb-2">✓ {message}</p>
          <button onClick={() => setStatus('idle')} className="text-xs" style={{ color: 'var(--text-muted)' }}>Import another</button>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p className="text-sm change-down mb-2">✗ {message}</p>
          <button onClick={() => setStatus('idle')} className="text-xs" style={{ color: 'var(--text-muted)' }}>Try again</button>
        </div>
      )}
    </div>
  )
}
