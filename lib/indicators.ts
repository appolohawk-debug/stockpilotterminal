// Technical indicator calculations for signal scoring

export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const emas: number[] = []

  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  emas[period - 1] = sum / period

  for (let i = period; i < closes.length; i++) {
    emas[i] = closes[i] * k + emas[i - 1] * (1 - k)
  }

  return emas
}

export function calcSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function calcMACD(closes: number[]): {
  macd: number
  signal: number
  histogram: number
} {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0 }

  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)

  const macdLine: number[] = []
  for (let i = 25; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) {
      macdLine.push(ema12[i] - ema26[i])
    }
  }

  const signalLine = calcEMA(macdLine, 9)
  const lastMACD = macdLine[macdLine.length - 1] ?? 0
  const lastSignal = signalLine[signalLine.length - 1] ?? 0

  return {
    macd: lastMACD,
    signal: lastSignal,
    histogram: lastMACD - lastSignal,
  }
}

export function calcBollinger(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: number; middle: number; lower: number; pctB: number } {
  if (closes.length < period) {
    const p = closes[closes.length - 1] ?? 0
    return { upper: p, middle: p, lower: p, pctB: 0.5 }
  }

  const slice = closes.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - middle, 2), 0) / period
  const sd = Math.sqrt(variance)
  const upper = middle + stdDev * sd
  const lower = middle - stdDev * sd
  const price = closes[closes.length - 1]
  const pctB = upper === lower ? 0.5 : (price - lower) / (upper - lower)

  return { upper, middle, lower, pctB }
}

export function calcADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number {
  if (highs.length < period + 1) return 20

  const trList: number[] = []
  const dmPlusList: number[] = []
  const dmMinusList: number[] = []

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trList.push(tr)

    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    dmPlusList.push(upMove > downMove && upMove > 0 ? upMove : 0)
    dmMinusList.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  const smoothTR = wilder(trList, period)
  const smoothPlus = wilder(dmPlusList, period)
  const smoothMinus = wilder(dmMinusList, period)

  const diPlus = smoothPlus.map((v, i) => (smoothTR[i] ? (v / smoothTR[i]) * 100 : 0))
  const diMinus = smoothMinus.map((v, i) => (smoothTR[i] ? (v / smoothTR[i]) * 100 : 0))

  const dx = diPlus.map((p, i) => {
    const sum = p + diMinus[i]
    return sum ? (Math.abs(p - diMinus[i]) / sum) * 100 : 0
  })

  const adxValues = wilder(dx, period)
  return adxValues[adxValues.length - 1] ?? 20
}

function wilder(data: number[], period: number): number[] {
  const result: number[] = []
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  result[period - 1] = sum / period

  for (let i = period; i < data.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + data[i]) / period
  }

  return result
}

export function calcAvgVolume(volumes: number[], period = 20): number {
  const slice = volumes.slice(-period)
  if (!slice.length) return 0
  return slice.reduce((a, b) => a + b, 0) / slice.length
}
