import yahooFinance from 'yahoo-finance2'
import type { Quote, OHLCVCandle } from './types'

// Suppress yahoo-finance2 validation notices
yahooFinance.setGlobalConfig({ validation: { logErrors: false } })

export function toNSETicker(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s
  return `${s}.NS`
}

export async function getQuote(ticker: string): Promise<Quote> {
  const result = await yahooFinance.quote(ticker)
  return {
    ticker,
    name: result.longName ?? result.shortName ?? ticker,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    volume: result.regularMarketVolume ?? 0,
    avgVolume: result.averageDailyVolume3Month ?? 0,
    marketCap: result.marketCap ?? null,
    pe: result.trailingPE ?? null,
    eps: result.epsTrailingTwelveMonths ?? null,
    dividendYield: result.trailingAnnualDividendYield ?? null,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? 0,
    beta: result.beta ?? null,
    currency: result.currency ?? 'INR',
    marketState: (result.marketState as Quote['marketState']) ?? 'CLOSED',
    timestamp: result.regularMarketTime ? new Date(result.regularMarketTime).getTime() : Date.now(),
  }
}

export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(tickers.map(getQuote))
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
    .map((r) => r.value)
}

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'
type ChartInterval = '5m' | '15m' | '30m' | '1h' | '1d' | '1wk'

export async function getChart(
  ticker: string,
  range: ChartRange = '6mo',
  interval: ChartInterval = '1d'
): Promise<OHLCVCandle[]> {
  const result = await yahooFinance.chart(ticker, {
    period1: rangeToDate(range),
    interval,
  })

  const quotes = result.quotes ?? []
  return quotes
    .filter((q) => q.open != null && q.close != null)
    .map((q) => ({
      time: new Date(q.date).getTime() / 1000,
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume ?? 0,
    }))
}

// Fetch 1 year of daily closes for indicator calculation
export async function getHistoricalCloses(ticker: string, days = 250): Promise<{
  closes: number[]
  highs: number[]
  lows: number[]
  volumes: number[]
}> {
  const result = await yahooFinance.chart(ticker, {
    period1: daysAgo(days),
    interval: '1d',
  })

  const quotes = (result.quotes ?? []).filter((q) => q.close != null)
  return {
    closes: quotes.map((q) => q.close!),
    highs: quotes.map((q) => q.high ?? q.close!),
    lows: quotes.map((q) => q.low ?? q.close!),
    volumes: quotes.map((q) => q.volume ?? 0),
  }
}

export async function getFundamentals(ticker: string) {
  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'],
    })
    return {
      pe: result.summaryDetail?.trailingPE ?? result.defaultKeyStatistics?.forwardPE ?? null,
      pb: result.defaultKeyStatistics?.priceToBook ?? null,
      debtToEquity: result.financialData?.debtToEquity ?? null,
      epsGrowth: result.defaultKeyStatistics?.earningsQuarterlyGrowth ?? null,
    }
  } catch {
    return { pe: null, pb: null, debtToEquity: null, epsGrowth: null }
  }
}

export async function searchTickers(query: string) {
  const result = await yahooFinance.search(query, { newsCount: 0, quotesCount: 8 })
  return (result.quotes ?? [])
    .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .filter((q) => q.symbol?.endsWith('.NS') || q.symbol?.endsWith('.BO'))
    .map((q) => ({
      ticker: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
    }))
}

function rangeToDate(range: ChartRange): Date {
  const days: Record<ChartRange, number> = {
    '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825,
  }
  return daysAgo(days[range])
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
