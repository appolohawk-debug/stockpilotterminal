'use client'
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { OHLCVCandle } from '@/lib/types'

interface Props {
  ticker: string
  candles: OHLCVCandle[]
}

type ChartType = 'candle' | 'line'
type Range = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'

const RANGES: Range[] = ['1d', '5d', '1mo', '3mo', '6mo', '1y']
const RANGE_LABELS: Record<Range, string> = {
  '1d': '1D', '5d': '5D', '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1Y',
}

export function StockChart({ ticker, candles: initialCandles }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartType, setChartType] = useState<ChartType>('candle')
  const [range, setRange] = useState<Range>('6mo')
  const [candles, setCandles] = useState(initialCandles)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!chartRef.current || !candles.length) return

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111118' },
        textColor: '#6b6b80',
      },
      grid: {
        vertLines: { color: '#2a2a3a' },
        horzLines: { color: '#2a2a3a' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#2a2a3a' },
      timeScale: { borderColor: '#2a2a3a', timeVisible: true },
      width: chartRef.current.clientWidth,
      height: 380,
    })

    if (chartType === 'candle') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#00c87a',
        downColor: '#f5424b',
        borderUpColor: '#00c87a',
        borderDownColor: '#f5424b',
        wickUpColor: '#00c87a',
        wickDownColor: '#f5424b',
      })
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      )
    } else {
      const series = chart.addSeries(LineSeries, { color: '#4b9eff', lineWidth: 2 })
      series.setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      )
    }

    // Volume histogram on a separate price scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#2a2a3a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0,200,122,0.3)' : 'rgba(245,66,75,0.3)',
      }))
    )

    chart.timeScale().fitContent()

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: chartRef.current?.clientWidth ?? 600 })
    })
    if (chartRef.current) observer.observe(chartRef.current)

    return () => {
      chart.remove()
      observer.disconnect()
    }
  }, [candles, chartType])

  async function changeRange(r: Range) {
    setRange(r)
    setLoading(true)
    const interval = r === '1d' ? '5m' : r === '5d' ? '15m' : '1d'
    const res = await fetch(
      `/api/chart/${encodeURIComponent(ticker)}?range=${r}&interval=${interval}`
    )
    const data = await res.json()
    setCandles(data)
    setLoading(false)
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Controls */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => changeRange(r)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                backgroundColor: range === r ? 'var(--blue)' : 'transparent',
                color: range === r ? '#fff' : 'var(--text-muted)',
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['candle', 'line'] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="text-xs px-2 py-1 rounded transition-colors capitalize"
              style={{
                backgroundColor: chartType === t ? 'var(--surface-2)' : 'transparent',
                color: chartType === t ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div
          className="flex items-center justify-center h-[380px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Loading...
        </div>
      )}
      <div ref={chartRef} className={`chart-container${loading ? ' hidden' : ''}`} />
    </div>
  )
}
