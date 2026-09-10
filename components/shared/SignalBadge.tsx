import type { SignalLabel } from '@/lib/types'

interface Props {
  label: SignalLabel
  score: number
  summary: string
  type: 'Technical' | 'Fundamental'
  size?: 'sm' | 'md'
}

const CONFIG: Record<SignalLabel, { dot: string; cls: string; text: string }> = {
  GREEN:  { dot: '●', cls: 'badge-green',  text: 'GREEN' },
  YELLOW: { dot: '●', cls: 'badge-yellow', text: 'YELLOW' },
  RED:    { dot: '●', cls: 'badge-red',    text: 'RED' },
}

export function SignalBadge({ label, score, summary, type, size = 'md' }: Props) {
  const c = CONFIG[label]
  const isSmall = size === 'sm'

  return (
    <div className={`rounded-lg p-3 ${isSmall ? 'p-2' : 'p-4'}`} style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{type} Signal</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${c.cls}`}>
          {c.dot} {c.text}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-1">
        <span className={`font-mono font-bold ${isSmall ? 'text-xl' : 'text-3xl'}`}>{score}</span>
        <span className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>/100</span>
      </div>
      <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>{summary}</p>
      <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
        Based on price/fundamental data only. Not financial advice.
      </p>
    </div>
  )
}
