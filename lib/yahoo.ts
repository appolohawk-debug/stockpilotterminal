import type { Quote, OHLCVCandle } from './types'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://finance.yahoo.com/',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function yfFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: YF_HEADERS })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Yahoo Finance ${res.status}: ${body}`)
  }
  return res.json()
}

export function toNSETicker(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s
  return `${s}.NS`
}

export async function getQuote(ticker: string): Promise<Quote> {
  const data = await yfFetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d&includePrePost=false`
  )
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error(`No data returned for ${ticker}`)
  const meta = result.meta
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice
  const price: number = meta.regularMarketPrice ?? 0
  const change = price - (prevClose ?? price)
  const changePercent = prevClose ? (change / prevClose) * 100 : 0
  return {
    ticker,
    name: meta.longName ?? meta.shortName ?? ticker,
    price,
    change,
    changePercent,
    volume: meta.regularMarketVolume ?? 0,
    avgVolume: meta.averageDailyVolume3Month ?? 0,
    marketCap: meta.marketCap ?? null,
    pe: meta.trailingPE ?? null,
    eps: meta.epsTrailingTwelveMonths ?? null,
    dividendYield: meta.trailingAnnualDividendYield ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    beta: meta.beta ?? null,
    currency: meta.currency ?? 'INR',
    marketState: (meta.marketState ?? 'CLOSED') as Quote['marketState'],
    timestamp: (meta.regularMarketTime ?? 0) * 1000,
  }
}

export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  if (!tickers.length) return []
  try {
    // Batch endpoint — one call for all tickers
    const data = await yfFetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.map(encodeURIComponent).join(',')}`
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data?.quoteResponse?.result ?? []).map((q: any): Quote => {
      const prevClose = q.regularMarketPreviousClose ?? q.regularMarketPrice
      const price: number = q.regularMarketPrice ?? 0
      const change = price - (prevClose ?? price)
      const changePercent = prevClose ? (change / prevClose) * 100 : 0
      return {
        ticker: q.symbol,
        name: q.longName ?? q.shortName ?? q.symbol,
        price,
        change,
        changePercent,
        volume: q.regularMarketVolume ?? 0,
        avgVolume: q.averageDailyVolume3Month ?? 0,
        marketCap: q.marketCap ?? null,
        pe: q.trailingPE ?? null,
        eps: q.epsTrailingTwelveMonths ?? null,
        dividendYield: q.trailingAnnualDividendYield ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        beta: q.beta ?? null,
        currency: q.currency ?? 'INR',
        marketState: (q.marketState ?? 'CLOSED') as Quote['marketState'],
        timestamp: (q.regularMarketTime ?? 0) * 1000,
      }
    })
  } catch {
    const results = await Promise.allSettled(tickers.map(getQuote))
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled')
      .map((r) => r.value)
  }
}

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'
type ChartInterval = '5m' | '15m' | '30m' | '1h' | '1d' | '1wk'

export async function getChart(
  ticker: string,
  range: ChartRange = '6mo',
  interval: ChartInterval = '1d'
): Promise<OHLCVCandle[]> {
  const data = await yfFetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}&includePrePost=false`
  )
  const result = data?.chart?.result?.[0]
  if (!result) return []
  const timestamps: number[] = result.timestamp ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = result.indicators?.quote?.[0] ?? {}
  return timestamps
    .map((t, i) => ({
      time: t,
      open: (q.open?.[i] as number | null) ?? 0,
      high: (q.high?.[i] as number | null) ?? 0,
      low: (q.low?.[i] as number | null) ?? 0,
      close: (q.close?.[i] as number | null) ?? 0,
      volume: (q.volume?.[i] as number | null) ?? 0,
    }))
    .filter((c) => c.close > 0)
}

export async function getHistoricalCloses(ticker: string, days = 250): Promise<{
  closes: number[]
  highs: number[]
  lows: number[]
  volumes: number[]
}> {
  const data = await yfFetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d&includePrePost=false`
  )
  const result = data?.chart?.result?.[0]
  if (!result) return { closes: [], highs: [], lows: [], volumes: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = result.indicators?.quote?.[0] ?? {}
  const keep = (arr: (number | null)[] | undefined) =>
    (arr ?? []).filter((v): v is number => v != null)
  return {
    closes: keep(q.close).slice(-days),
    highs: keep(q.high).slice(-days),
    lows: keep(q.low).slice(-days),
    volumes: keep(q.volume).slice(-days),
  }
}

export async function getFundamentals(ticker: string) {
  try {
    const data = await yfFetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData`
    )
    const r = data?.quoteSummary?.result?.[0]
    if (!r) return { pe: null, pb: null, debtToEquity: null, epsGrowth: null }
    return {
      pe: r.summaryDetail?.trailingPE?.raw ?? r.defaultKeyStatistics?.forwardPE?.raw ?? null,
      pb: r.defaultKeyStatistics?.priceToBook?.raw ?? null,
      debtToEquity: r.financialData?.debtToEquity?.raw ?? null,
      epsGrowth: r.defaultKeyStatistics?.earningsQuarterlyGrowth?.raw ?? null,
    }
  } catch {
    return { pe: null, pb: null, debtToEquity: null, epsGrowth: null }
  }
}

export async function searchTickers(query: string) {
  try {
    const data = await yfFetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`
    )
    return ((data.quotes ?? []) as { quoteType?: string; symbol?: string; longname?: string; shortname?: string; exchange?: string }[])
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .filter((q) => !!q.symbol)
      .map((q) => ({
        ticker: toNSETicker(q.symbol!),
        name: q.longname ?? q.shortname ?? q.symbol!,
        exchange: q.exchange ?? '',
        type: q.quoteType ?? '',
      }))
  } catch {
    return []
  }
}
