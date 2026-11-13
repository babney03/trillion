import type { Candle } from './types'
import type { HTF } from './indicators'

export interface Swing {
  i: number
  price: number
  kind: 'high' | 'low'
  /** First bar index at which this swing is knowable. */
  confirmedAt: number
}

/** Pivot highs/lows with `n` bars each side. A swing at bar j is only knowable at j + n. */
export function findSwings(c: Candle[], n: number): Swing[] {
  const out: Swing[] = []
  for (let j = n; j < c.length - n; j++) {
    let hi = true
    let lo = true
    for (let k = 1; k <= n && (hi || lo); k++) {
      if (!(c[j].h > c[j - k].h) || !(c[j].h >= c[j + k].h)) hi = false
      if (!(c[j].l < c[j - k].l) || !(c[j].l <= c[j + k].l)) lo = false
    }
    if (hi) out.push({ i: j, price: c[j].h, kind: 'high', confirmedAt: j + n })
    if (lo) out.push({ i: j, price: c[j].l, kind: 'low', confirmedAt: j + n })
  }
  return out
}

export interface StructEvent {
  i: number
  dir: 1 | -1
  level: number
  /** Bar index of the swing that was broken. */
  swingI: number
  /** True when the break reverses the prior trend (change of character). */
  flip: boolean
}

export interface Structure {
  /** Direction of the latest break of structure at each bar: 1, -1, or 0 before any break. */
  trend: Int8Array
  events: StructEvent[]
  eventAt: Map<number, StructEvent>
}

/** A close beyond the most recent confirmed, unbroken swing is a break of structure. */
export function buildStructure(c: Candle[], swings: Swing[]): Structure {
  const trend = new Int8Array(c.length)
  const events: StructEvent[] = []
  const eventAt = new Map<number, StructEvent>()
  let p = 0
  let hi: Swing | null = null
  let lo: Swing | null = null
  let cur: 0 | 1 | -1 = 0
  for (let i = 0; i < c.length; i++) {
    while (p < swings.length && swings[p].confirmedAt <= i) {
      const s = swings[p++]
      if (s.kind === 'high') hi = s
      else lo = s
    }
    let ev: StructEvent | null = null
    if (hi && c[i].c > hi.price) {
      ev = { i, dir: 1, level: hi.price, swingI: hi.i, flip: cur === -1 }
      hi = null
      cur = 1
    } else if (lo && c[i].c < lo.price) {
      ev = { i, dir: -1, level: lo.price, swingI: lo.i, flip: cur === 1 }
      lo = null
      cur = -1
    }
    if (ev) {
      events.push(ev)
      eventAt.set(i, ev)
    }
    trend[i] = cur
  }
  return { trend, events, eventAt }
}

export interface FVG {
  /** Bar index of the third candle; the gap is knowable at its close. */
  i: number
  dir: 1 | -1
  top: number
  bottom: number
}

export function findFVGs(c: Candle[], atr: ArrayLike<number>, minAtrFrac: number): FVG[] {
  const out: FVG[] = []
  for (let i = 2; i < c.length; i++) {
    const min = minAtrFrac * atr[i]
    if (c[i].l > c[i - 2].h && c[i].l - c[i - 2].h >= min) {
      out.push({ i, dir: 1, top: c[i].l, bottom: c[i - 2].h })
    } else if (c[i].h < c[i - 2].l && c[i - 2].l - c[i].h >= min) {
      out.push({ i, dir: -1, top: c[i - 2].l, bottom: c[i].h })
    }
  }
  return out
}

export interface Level {
  price: number
  kind: 'high' | 'low'
  /** Base bar index at whose close the level is known. It can be swept from the next bar. */
  from: number
  /** Last base bar index on which the level is still watched. */
  until?: number
  src: string
}

export interface Sweep {
  /** Bar that closed back inside the level. */
  i: number
  /** Bar that first traded through the level. */
  i0: number
  /** 'low' = sell-side liquidity taken (bullish), 'high' = buy-side taken (bearish). */
  kind: 'high' | 'low'
  level: number
  extreme: number
  src: string
}

interface LiveLevel extends Level {
  pierceAt?: number
  extreme?: number
}

/**
 * A sweep is price trading through a level and closing back inside within
 * `reclaimBars`. A level that price accepts beyond is a break, not a sweep.
 */
export function findSweeps(c: Candle[], levels: Level[], maxAge = 2016, reclaimBars = 3): Sweep[] {
  const sorted = [...levels].sort((a, b) => a.from - b.from)
  const active: LiveLevel[] = []
  const out: Sweep[] = []
  let p = 0
  for (let i = 0; i < c.length; i++) {
    while (p < sorted.length && sorted[p].from < i) active.push({ ...sorted[p++] })
    for (let k = active.length - 1; k >= 0; k--) {
      const L = active[k]
      if (i - L.from > maxAge || (L.until !== undefined && i > L.until)) {
        active.splice(k, 1)
        continue
      }
      const b = c[i]
      if (L.kind === 'low') {
        if (L.pierceAt === undefined) {
          if (b.l >= L.price) continue
          L.pierceAt = i
          L.extreme = b.l
        } else if (b.l < L.extreme!) L.extreme = b.l
        if (b.c > L.price) {
          out.push({ i, i0: L.pierceAt, kind: 'low', level: L.price, extreme: L.extreme!, src: L.src })
          active.splice(k, 1)
        } else if (i - L.pierceAt >= reclaimBars) active.splice(k, 1)
      } else {
        if (L.pierceAt === undefined) {
          if (b.h <= L.price) continue
          L.pierceAt = i
          L.extreme = b.h
        } else if (b.h > L.extreme!) L.extreme = b.h
        if (b.c < L.price) {
          out.push({ i, i0: L.pierceAt, kind: 'high', level: L.price, extreme: L.extreme!, src: L.src })
          active.splice(k, 1)
        } else if (i - L.pierceAt >= reclaimBars) active.splice(k, 1)
      }
    }
  }
  return out.sort((a, b) => a.i - b.i)
}

/** Higher-timeframe swing highs/lows as liquidity levels on the base series. */
export function htfSwingLevels(htf: HTF, n: number, src: string): Level[] {
  const out: Level[] = []
  for (const s of findSwings(htf.candles, n)) {
    const from = s.confirmedAt < htf.closeIdx.length ? htf.closeIdx[s.confirmedAt] : -1
    if (from >= 0) out.push({ price: s.price, kind: s.kind, from, src })
  }
  return out
}

/** Each completed day's high and low, watched through the following day. */
export function dayLevels(c: Candle[], dayOf: (t: number) => number, src: string): Level[] {
  const out: Level[] = []
  let day = NaN
  let hi = -Infinity
  let lo = Infinity
  let pending: Level[] = []
  for (let i = 0; i < c.length; i++) {
    const d = dayOf(c[i].t)
    if (d !== day) {
      for (const L of pending) L.until = i - 1
      pending = []
      if (!Number.isNaN(day)) {
        pending = [
          { price: hi, kind: 'high', from: i - 1, src },
          { price: lo, kind: 'low', from: i - 1, src },
        ]
        out.push(...pending)
      }
      day = d
      hi = -Infinity
      lo = Infinity
    }
    if (c[i].h > hi) hi = c[i].h
    if (c[i].l < lo) lo = c[i].l
  }
  return out
}

/** Latest item with a <= x.i <= b in an array sorted by i, or null. */
export function latestIn<T extends { i: number }>(arr: T[], a: number, b: number): T | null {
  let lo = 0
  let hi = arr.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid].i <= b) {
      best = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return best >= 0 && arr[best].i >= a ? arr[best] : null
}
