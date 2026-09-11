'use client'
import { useQuery } from '@tanstack/react-query'
import type { SignalResponse } from '@/lib/types'

const COLORS = {
  GREEN:  { bg: 'rgba(0,200,122,0.15)',  color: '#00c87a' },
  YELLOW: { bg: 'rgba(255,185,0,0.15)',  color: '#ffb900' },
  RED:    { bg: 'rgba(245,66,75,0.15)',  color: '#f5424b' },
} as const

type Label = keyof typeof COLORS

export function SignalPills({ ticker }: { ticker: string }) {
  const { data: signal, isLoading } = useQuery<SignalResponse>({
    queryKey: ['signal', ticker],
    queryFn: () => fetch(`/api/signal/${encodeURIComponent(ticker)}`).then((r) => r.json()),
    staleTime: 15 * 60_000,
    gcTime: 20 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex gap-1">
        <span className="w-9 h-5 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-2)' }} />
        <span className="w-9 h-5 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-2)' }} />
      </div>
    )
  }

  if (!signal?.technical) return null

  const t = COLORS[signal.technical.label as Label] ?? COLORS.YELLOW
  const f = COLORS[signal.fundamental.label as Label] ?? COLORS.YELLOW

  return (
    <div
      className="flex gap-1"
      title={`Technical: ${signal.technical.score} · Fundamental: ${signal.fundamental.score}`}
    >
      <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: t.bg, color: t.color }}>
        T{signal.technical.score}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: f.bg, color: f.color }}>
        F{signal.fundamental.score}
      </span>
    </div>
  )
}


  if (isLoading) {
    return (
      <div className="flex gap-1">
        <span className="text-xs w-10 h-5 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-2)' }} />
        <span className="text-xs w-10 h-5 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-2)' }} />
      </div>
    )
  }

  if (!signal?.technical) return null

  const t = COLORS[signal.technical.label as Label] ?? COLORS.YELLOW
  const f = COLORS[signal.fundamental.label as Label] ?? COLORS.YELLOW

  return (
    <div className="flex gap-1" title={`Technical: ${signal.technical.score} · Fundamental: ${signal.fundamental.score}`}>
      <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: t.bg, color: t.color }}>
        T{signal.technical.score}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: f.bg, color: f.color }}>
        F{signal.fundamental.score}
      </span>
    </div>
  )
}
