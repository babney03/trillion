import type { Candle } from './types'

export function ema(v: ArrayLike<number>, period: number): Float64Array {
  const out = new Float64Array(v.length)
  const k = 2 / (period + 1)
  let prev = 0
  for (let i = 0; i < v.length; i++) {
    prev = i === 0 ? v[0] : v[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/** Wilder's average true range. */
export function atr(c: Candle[], period = 14): Float64Array {
  const out = new Float64Array(c.length)
  let prev = 0
  for (let i = 0; i < c.length; i++) {
    const tr =
      i === 0
        ? c[0].h - c[0].l
        : Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c))
    prev = i < period ? (prev * i + tr) / (i + 1) : (prev * (period - 1) + tr) / period
    out[i] = prev
  }
  return out
}

/** Wilder's RSI. Returns 50 until warmed up. */
export function rsi(closes: ArrayLike<number>, period = 14): Float64Array {
  const out = new Float64Array(closes.length).fill(50)
  let gain = 0
  let loss = 0
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    const g = d > 0 ? d : 0
    const l = d < 0 ? -d : 0
    if (i <= period) {
      gain += g / period
      loss += l / period
    } else {
      gain = (gain * (period - 1) + g) / period
      loss = (loss * (period - 1) + l) / period
    }
    if (i >= period) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)
  }
  return out
}

/** Volume-weighted average price, re-anchored at each UTC midnight. */
export function vwapDaily(c: Candle[]): Float64Array {
  const out = new Float64Array(c.length)
  let day = -1
  let pv = 0
  let vol = 0
  for (let i = 0; i < c.length; i++) {
    const d = Math.floor(c[i].t / 86_400_000)
    if (d !== day) {
      day = d
      pv = 0
      vol = 0
    }
    const tp = (c[i].h + c[i].l + c[i].c) / 3
    const v = c[i].v > 0 ? c[i].v : 1e-9
    pv += tp * v
    vol += v
    out[i] = pv / vol
  }
  return out
}

export interface HTF {
  candles: Candle[]
  /** lastComplete[i]: index of the newest fully closed higher-timeframe bar at the close of base bar i, or -1. */
  lastComplete: Int32Array
  /** closeIdx[k]: first base index at which higher-timeframe bar k is known to be complete, or -1. */
  closeIdx: Int32Array
}

/** Roll base bars up into a higher timeframe without leaking the forming bar. */
export function aggregate(c: Candle[], tfMs: number, baseMs: number): HTF {
  const candles: Candle[] = []
  const lastComplete = new Int32Array(c.length).fill(-1)
  let cur: Candle | null = null
  let completed = -1
  for (let i = 0; i < c.length; i++) {
    const b = c[i]
    const bucket = Math.floor(b.t / tfMs) * tfMs
    if (!cur || cur.t !== bucket) {
      cur = { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }
      candles.push(cur)
      if (candles.length - 2 > completed) completed = candles.length - 2
    } else {
      if (b.h > cur.h) cur.h = b.h
      if (b.l < cur.l) cur.l = b.l
      cur.c = b.c
      cur.v += b.v
    }
    if (b.t + baseMs >= bucket + tfMs) completed = candles.length - 1
    lastComplete[i] = completed
  }
  const closeIdx = new Int32Array(candles.length).fill(-1)
  let k = 0
  for (let i = 0; i < c.length; i++) {
    while (k <= lastComplete[i]) closeIdx[k++] = i
  }
  return { candles, lastComplete, closeIdx }
}
