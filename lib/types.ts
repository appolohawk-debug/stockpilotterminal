// Shared TypeScript types for StockPilot NSE Terminal

export interface Quote {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  avgVolume: number
  marketCap: number | null
  pe: number | null
  eps: number | null
  dividendYield: number | null
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  beta: number | null
  currency: string
  marketState: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED' | 'PREPRE' | 'POSTPOST'
  timestamp: number
}

export interface OHLCVCandle {
  time: number   // Unix timestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Holding {
  id: number
  ticker: string
  shares: number
  avgCost: number
  createdAt: string
  // enriched fields (not stored)
  currentPrice?: number
  currentValue?: number
  unrealizedPnl?: number
  unrealizedPnlPct?: number
  dayChange?: number
  dayChangePct?: number
  name?: string
}

export interface Transaction {
  id: number
  ticker: string
  type: 'BUY' | 'SELL'
  shares: number
  price: number
  date: string
  notes: string | null
  createdAt: string
}

export interface WatchlistItem {
  id: number
  ticker: string
  groupName: string
  addedAt: string
  // enriched fields
  price?: number
  change?: number
  changePercent?: number
  name?: string
}

export interface MarketIndex {
  name: string
  ticker: string
  price: number
  change: number
  changePercent: number
}

// Signal scores
export interface IndicatorResult {
  score: number        // 0-100
  signal: 'bullish' | 'neutral' | 'bearish'
}

export interface TechnicalBreakdown {
  rsi: IndicatorResult & { value: number }
  sma: IndicatorResult & { sma50: number; sma200: number; priceAbove50: boolean; priceAbove200: boolean; goldenCross: boolean }
  macd: IndicatorResult & { macd: number; signalLine: number; histogram: number }
  volume: IndicatorResult & { current: number; avg20: number }
  adx: IndicatorResult & { value: number }
  bollinger: IndicatorResult & { upper: number; middle: number; lower: number; pctB: number }
}

export interface FundamentalBreakdown {
  pe: IndicatorResult & { value: number | null }
  pb: IndicatorResult & { value: number | null }
  debtToEquity: IndicatorResult & { value: number | null }
  epsGrowth: IndicatorResult & { value: number | null }
}

export type SignalLabel = 'GREEN' | 'YELLOW' | 'RED'

export interface SignalScore {
  score: number
  label: SignalLabel
  summary: string
}

export interface SignalResponse {
  ticker: string
  technical: SignalScore & { breakdown: TechnicalBreakdown }
  fundamental: SignalScore & { breakdown: FundamentalBreakdown }
  computedAt: string
}

// Zerodha CSV row shape
export interface ZerodhaHolding {
  Tradingsymbol: string
  ISIN: string
  Quantity: number
  'Average price': number
  'Last price': number
  'Close price': number
  'PnL': number
}
