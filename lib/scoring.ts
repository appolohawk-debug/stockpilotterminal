import {
  calcRSI, calcSMA, calcMACD, calcBollinger, calcADX, calcAvgVolume,
} from './indicators'
import type {
  TechnicalBreakdown, FundamentalBreakdown, SignalScore, SignalLabel,
  IndicatorResult,
} from './types'

// ─── Technical Score ─────────────────────────────────────────────────────────

const TECHNICAL_WEIGHTS = {
  rsi: 0.20,
  sma: 0.25,
  macd: 0.20,
  volume: 0.15,
  adx: 0.10,
  bollinger: 0.10,
}

export function computeTechnicalScore(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): { score: number; label: SignalLabel; summary: string; breakdown: TechnicalBreakdown } {

  // RSI
  const rsiValue = calcRSI(closes)
  const rsiIndicator: IndicatorResult & { value: number } = {
    value: rsiValue,
    ...scoreRSI(rsiValue),
  }

  // SMA
  const sma50 = calcSMA(closes, 50)
  const sma200 = calcSMA(closes, 200)
  const price = closes[closes.length - 1]
  const priceAbove50 = price > sma50
  const priceAbove200 = price > sma200
  const goldenCross = sma50 > sma200
  const smaRawScore = ([priceAbove50, priceAbove200, goldenCross].filter(Boolean).length / 3) * 100
  const smaIndicator = {
    score: smaRawScore,
    signal: (smaRawScore >= 67 ? 'bullish' : smaRawScore >= 34 ? 'neutral' : 'bearish') as IndicatorResult['signal'],
    sma50, sma200, priceAbove50, priceAbove200, goldenCross,
  }

  // MACD
  const macdData = calcMACD(closes)
  const macdIndicator = {
    ...scoreMomentum(macdData.histogram),
    ...macdData,
  }

  // Volume
  const avgVol = calcAvgVolume(volumes, 20)
  const lastVol = volumes[volumes.length - 1] ?? 0
  const lastClose = closes[closes.length - 1]
  const prevClose = closes[closes.length - 2] ?? lastClose
  const dayUp = lastClose >= prevClose
  const volScore = calcVolumeScore(lastVol, avgVol, dayUp)
  const volumeIndicator = {
    score: volScore,
    signal: (volScore >= 60 ? 'bullish' : volScore >= 40 ? 'neutral' : 'bearish') as IndicatorResult['signal'],
    current: lastVol,
    avg20: avgVol,
  }

  // ADX
  const adxValue = calcADX(highs, lows, closes)
  const adxIndicator = {
    ...scoreADX(adxValue),
    value: adxValue,
  }

  // Bollinger
  const bb = calcBollinger(closes)
  const bbIndicator = {
    ...scoreBollinger(bb.pctB),
    ...bb,
  }

  // Weighted composite
  const raw =
    rsiIndicator.score * TECHNICAL_WEIGHTS.rsi +
    smaIndicator.score * TECHNICAL_WEIGHTS.sma +
    macdIndicator.score * TECHNICAL_WEIGHTS.macd +
    volumeIndicator.score * TECHNICAL_WEIGHTS.volume +
    adxIndicator.score * TECHNICAL_WEIGHTS.adx +
    bbIndicator.score * TECHNICAL_WEIGHTS.bollinger

  const score = Math.round(raw)
  const label = scoreToLabel(score)

  return {
    score,
    label,
    summary: technicalSummary(label, rsiValue, goldenCross, macdData.histogram),
    breakdown: {
      rsi: rsiIndicator,
      sma: smaIndicator,
      macd: macdIndicator,
      volume: volumeIndicator,
      adx: adxIndicator,
      bollinger: bbIndicator,
    },
  }
}

// ─── Fundamental Score ────────────────────────────────────────────────────────

const FUNDAMENTAL_WEIGHTS = { pe: 0.30, pb: 0.25, debtToEquity: 0.25, epsGrowth: 0.20 }

export function computeFundamentalScore(fundamentals: {
  pe: number | null
  pb: number | null
  debtToEquity: number | null
  epsGrowth: number | null
}): { score: number; label: SignalLabel; summary: string; breakdown: FundamentalBreakdown } {

  const peIndicator = { value: fundamentals.pe, ...scorePE(fundamentals.pe) }
  const pbIndicator = { value: fundamentals.pb, ...scorePB(fundamentals.pb) }
  const deRatioIndicator = { value: fundamentals.debtToEquity, ...scoreDE(fundamentals.debtToEquity) }
  const epsIndicator = { value: fundamentals.epsGrowth, ...scoreEPSGrowth(fundamentals.epsGrowth) }

  const raw =
    peIndicator.score * FUNDAMENTAL_WEIGHTS.pe +
    pbIndicator.score * FUNDAMENTAL_WEIGHTS.pb +
    deRatioIndicator.score * FUNDAMENTAL_WEIGHTS.debtToEquity +
    epsIndicator.score * FUNDAMENTAL_WEIGHTS.epsGrowth

  const score = Math.round(raw)
  const label = scoreToLabel(score)

  return {
    score,
    label,
    summary: fundamentalSummary(label, fundamentals),
    breakdown: {
      pe: peIndicator,
      pb: pbIndicator,
      debtToEquity: deRatioIndicator,
      epsGrowth: epsIndicator,
    },
  }
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function scoreToLabel(score: number): SignalLabel {
  if (score >= 70) return 'GREEN'
  if (score >= 40) return 'YELLOW'
  return 'RED'
}

function scoreRSI(rsi: number): IndicatorResult {
  // Healthy zone 40-60 = 100, extreme zones taper off
  if (rsi >= 40 && rsi <= 60) return { score: 100, signal: 'bullish' }
  if (rsi > 60 && rsi <= 70) return { score: 70, signal: 'bullish' }
  if (rsi < 40 && rsi >= 30) return { score: 70, signal: 'neutral' }
  if (rsi > 70 && rsi <= 80) return { score: 30, signal: 'bearish' }
  if (rsi < 30 && rsi >= 20) return { score: 30, signal: 'bearish' }
  return { score: 0, signal: 'bearish' } // extreme overbought/oversold
}

function scoreMomentum(histogram: number): IndicatorResult {
  if (histogram > 0) return { score: 80, signal: 'bullish' }
  if (histogram === 0) return { score: 50, signal: 'neutral' }
  return { score: 20, signal: 'bearish' }
}

function calcVolumeScore(current: number, avg: number, dayUp: boolean): number {
  if (!avg) return 50
  const ratio = current / avg
  if (dayUp && ratio > 1.2) return 90   // high vol on up day — conviction
  if (dayUp && ratio >= 0.8) return 65
  if (!dayUp && ratio > 1.2) return 20  // high vol on down day — distribution
  if (!dayUp && ratio >= 0.8) return 40
  return 50
}

function scoreADX(adx: number): IndicatorResult {
  if (adx >= 25) return { score: 80, signal: 'bullish' }
  if (adx >= 20) return { score: 55, signal: 'neutral' }
  return { score: 30, signal: 'bearish' }
}

function scoreBollinger(pctB: number): IndicatorResult {
  if (pctB >= 0.3 && pctB <= 0.7) return { score: 80, signal: 'bullish' }
  if (pctB >= 0.15 && pctB < 0.3) return { score: 55, signal: 'neutral' }
  if (pctB > 0.7 && pctB <= 0.85) return { score: 55, signal: 'neutral' }
  return { score: 15, signal: 'bearish' }
}

function scorePE(pe: number | null): IndicatorResult {
  if (pe == null || pe < 0) return { score: 40, signal: 'neutral' } // negative = loss-making
  if (pe <= 15) return { score: 90, signal: 'bullish' }
  if (pe <= 25) return { score: 75, signal: 'bullish' }
  if (pe <= 40) return { score: 50, signal: 'neutral' }
  if (pe <= 60) return { score: 25, signal: 'bearish' }
  return { score: 10, signal: 'bearish' }
}

function scorePB(pb: number | null): IndicatorResult {
  if (pb == null) return { score: 50, signal: 'neutral' }
  if (pb <= 1) return { score: 90, signal: 'bullish' }
  if (pb <= 3) return { score: 75, signal: 'bullish' }
  if (pb <= 6) return { score: 50, signal: 'neutral' }
  if (pb <= 10) return { score: 25, signal: 'bearish' }
  return { score: 10, signal: 'bearish' }
}

function scoreDE(de: number | null): IndicatorResult {
  if (de == null) return { score: 50, signal: 'neutral' }
  if (de <= 0.3) return { score: 95, signal: 'bullish' }
  if (de <= 0.5) return { score: 80, signal: 'bullish' }
  if (de <= 1.0) return { score: 60, signal: 'neutral' }
  if (de <= 2.0) return { score: 30, signal: 'bearish' }
  return { score: 10, signal: 'bearish' }
}

function scoreEPSGrowth(growth: number | null): IndicatorResult {
  if (growth == null) return { score: 50, signal: 'neutral' }
  const pct = growth * 100
  if (pct >= 20) return { score: 95, signal: 'bullish' }
  if (pct >= 10) return { score: 75, signal: 'bullish' }
  if (pct >= 0) return { score: 55, signal: 'neutral' }
  if (pct >= -10) return { score: 25, signal: 'bearish' }
  return { score: 10, signal: 'bearish' }
}

function technicalSummary(label: SignalLabel, rsi: number, goldenCross: boolean, macdHist: number): string {
  if (label === 'GREEN') {
    if (goldenCross && macdHist > 0) return 'Strong uptrend — golden cross + positive MACD momentum'
    if (goldenCross) return 'Trend intact — price above key moving averages'
    return 'Momentum healthy — indicators broadly bullish'
  }
  if (label === 'YELLOW') {
    if (rsi > 65) return 'Approaching overbought — consider waiting for pullback'
    if (rsi < 35) return 'Oversold territory — potential reversal zone'
    return 'Mixed signals — no clear directional conviction'
  }
  return 'Technically weak — trend and momentum unfavorable'
}

function fundamentalSummary(
  label: SignalLabel,
  f: { pe: number | null; pb: number | null; debtToEquity: number | null; epsGrowth: number | null }
): string {
  if (label === 'GREEN') return 'Fundamentally healthy — reasonable valuation and strong earnings'
  if (label === 'YELLOW') {
    if (f.pe && f.pe > 40) return 'Expensive valuation — earnings growth needs to justify P/E'
    if (f.debtToEquity && f.debtToEquity > 1) return 'Elevated debt — watch leverage trend'
    return 'Mixed fundamentals — some caution warranted'
  }
  return 'Weak fundamentals — overvalued or poor earnings quality'
}
