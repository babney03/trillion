import type { Candle, TradeCtx } from './types'
import { atr } from './indicators'
import { nyClock } from './time'

export function sessionOf(t: number): TradeCtx['session'] {
  const m = nyClock(t).min
  if (m >= 19 * 60 || m < 2 * 60) return 'asia'
  if (m < 8 * 60) return 'london'
  if (m < 16 * 60) return 'newyork'
  return 'late'
}

/** Tags each bar with its session and whether volatility is unusual for the last ~2 days. */
export function contextFn(c: Candle[], lookback = 576): (i: number) => TradeCtx {
  const a = atr(c)
  const rel = new Float64Array(c.length)
  const mean = new Float64Array(c.length)
  let sum = 0
  for (let i = 0; i < c.length; i++) {
    rel[i] = c[i].c > 0 ? a[i] / c[i].c : 0
    sum += rel[i]
    if (i >= lookback) sum -= rel[i - lookback]
    mean[i] = sum / Math.min(i + 1, lookback)
  }
  return (i) => {
    const ratio = mean[i] > 0 ? rel[i] / mean[i] : 1
    return { session: sessionOf(c[i].t), vol: ratio < 0.8 ? 'low' : ratio > 1.25 ? 'high' : 'normal' }
  }
}
