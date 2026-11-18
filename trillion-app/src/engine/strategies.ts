import type { Candle, OrderIntent, Params, SignalFn } from './types'
import { aggregate, atr, ema, rsi, vwapDaily } from './indicators'
import {
  buildStructure,
  dayLevels,
  findFVGs,
  findSwings,
  findSweeps,
  htfSwingLevels,
  latestIn,
  type FVG,
  type Level,
  type Structure,
  type Sweep,
} from './structure'
import { nyClock } from './time'

export type StrategyId = 'liquidity' | 'tap' | 'ict' | 'scalper'

export interface StrategyDef {
  id: StrategyId
  name: string
  blurb: string
  defaults: Params
  /** Values tried by the walk-forward check and the bot's weekly re-tune. */
  grid: Record<string, number[]>
  /** Bars of history the strategy needs before its signals are trustworthy. */
  warmup: number
  /** Trial strategies trade in shadow only: the bot never puts paper money on them automatically. */
  trial?: boolean
  prepare(c: Candle[], p: Params, tfMs?: number): SignalFn
}

const M5 = 300_000

interface SweepCore {
  c: Candle[]
  atr: Float64Array
  st5: Structure
  bull: FVG[]
  bear: FVG[]
  lows: Sweep[]
  highs: Sweep[]
}

/**
 * Shared entry model: liquidity sweep -> break of structure -> fair value gap.
 * Evaluated on the bar where the 5m break happens (or the bar after, if that
 * bar completes the gap).
 */
function sweepBosFvg(k: SweepCore, i: number, dir: 1 | -1, p: Params, setup: string): OrderIntent | null {
  const { c, st5 } = k
  let bos = st5.eventAt.get(i)
  let fvgFrom = -1
  if (!bos || bos.dir !== dir) {
    bos = st5.eventAt.get(i - 1)
    if (!bos || bos.dir !== dir) return null
    fvgFrom = i // only a gap completed on this bar is new information
  }
  const sweeps = dir === 1 ? k.lows : k.highs
  const sw = latestIn(sweeps, bos.i - p.sweepLookback, bos.i)
  if (!sw) return null
  const gap = latestIn(dir === 1 ? k.bull : k.bear, Math.max(sw.i0, fvgFrom), i)
  if (!gap) return null

  // Extreme of the move that took the liquidity, up to now.
  let ext = sw.extreme
  for (let j = sw.i0; j <= i; j++) ext = dir === 1 ? Math.min(ext, c[j].l) : Math.max(ext, c[j].h)

  const a = k.atr[i]
  const size = gap.top - gap.bottom
  const entry = dir === 1 ? gap.top - p.fvgEntry * size : gap.bottom + p.fvgEntry * size
  const stop = dir === 1 ? ext - p.stopBufAtr * a : ext + p.stopBufAtr * a
  const risk = (entry - stop) * dir
  if (!(risk >= p.minStopAtr * a && risk <= p.maxStopAtr * a)) return null
  // Must be a resting order: price has to come back to the gap, and must not have been there already.
  if ((c[i].c - entry) * dir <= 0) return null
  for (let j = gap.i + 1; j <= i; j++) {
    if (dir === 1 ? c[j].l <= entry : c[j].h >= entry) return null
  }
  return {
    side: dir === 1 ? 'long' : 'short',
    type: 'limit',
    entry,
    stop,
    target: entry + dir * p.rr * risk,
    expiryBars: p.expiryBars,
    setup: `${setup}:${sw.src}`,
  }
}

function splitByDir(fvgs: FVG[]) {
  return { bull: fvgs.filter((f) => f.dir === 1), bear: fvgs.filter((f) => f.dir === -1) }
}

function splitSweeps(s: Sweep[]) {
  return { lows: s.filter((x) => x.kind === 'low'), highs: s.filter((x) => x.kind === 'high') }
}

/** Owner's strategy: 1h bias, 15m confirmation, 5m sweep -> BOS -> FVG, 2.5R. */
function prepareLiquidity(c: Candle[], p: Params, tfMs = M5): SignalFn {
  const a = atr(c)
  const h1 = aggregate(c, 3_600_000, tfMs)
  const m15 = aggregate(c, 900_000, tfMs)
  const s1h = buildStructure(h1.candles, findSwings(h1.candles, p.htfPivot))
  const s15 = buildStructure(m15.candles, findSwings(m15.candles, p.mtfPivot))
  const st5 = buildStructure(c, findSwings(c, p.ltfPivot))
  const levels: Level[] = [
    ...htfSwingLevels(m15, p.mtfPivot, '15m-swing'),
    ...htfSwingLevels(h1, p.htfPivot, '1h-swing'),
    ...dayLevels(c, (t) => Math.floor(t / 86_400_000), 'prev-day'),
  ]
  // Daily bias from the previous day's high and low (UTC days):
  // a close beyond yesterday's range sets the direction; a run on one side that closes back
  // inside points the other way; anything else is neutral (no trades).
  const d1 = aggregate(c, 86_400_000, tfMs)
  const dBias = new Int8Array(d1.candles.length)
  for (let k = 1; k < d1.candles.length; k++) {
    const y = d1.candles[k]
    const pv = d1.candles[k - 1]
    if (y.c > pv.h) dBias[k] = 1
    else if (y.c < pv.l) dBias[k] = -1
    else if (y.h > pv.h && y.c < pv.h && !(y.l < pv.l)) dBias[k] = -1
    else if (y.l < pv.l && y.c > pv.l && !(y.h > pv.h)) dBias[k] = 1
  }
  const core: SweepCore = {
    c,
    atr: a,
    st5,
    ...splitByDir(findFVGs(c, a, p.minFvgAtr)),
    ...splitSweeps(findSweeps(c, levels)),
  }
  return (i) => {
    const k1 = h1.lastComplete[i]
    const k15 = m15.lastComplete[i]
    if (k1 < 0 || k15 < 0) return null
    const bias = s1h.trend[k1]
    if (bias === 0 || s15.trend[k15] !== bias) return null
    if (p.dailyBias) {
      const kd = d1.lastComplete[i]
      if (kd < 0 || dBias[kd] !== bias) return null
    }
    return sweepBosFvg(core, i, bias as 1 | -1, p, 'liq')
  }
}

/**
 * Trial: the same setup as Trillion Liquidity, but instead of resting a limit order in the gap,
 * wait for price to tap the gap and then break a 1-bar swing in the trade direction, and enter
 * at market on that close. Stop and 2.5R target as in the base strategy.
 */
function prepareTap(c: Candle[], p: Params, tfMs = M5): SignalFn {
  const base = prepareLiquidity(c, p, tfMs)
  const a = atr(c)
  const micro = findSwings(c, 1)
  const highs = micro.filter((s) => s.kind === 'high')
  const lows = micro.filter((s) => s.kind === 'low')
  /** Newest 1-bar swing of a kind confirmed by bar k whose bar index is above `after`. */
  const newest = (list: typeof micro, k: number, after: number): number => {
    let lo = 0
    let hi = list.length - 1
    let at = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (list[mid].confirmedAt <= k) {
        at = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return at >= 0 && list[at].i > after ? list[at].price : NaN
  }
  return (i) => {
    for (let j = i - 1; j >= Math.max(0, i - p.expiryBars); j--) {
      const o = base(j)
      if (!o) continue
      const dir = o.side === 'long' ? 1 : -1
      let tapK = -1
      for (let k = j + 1; k <= i; k++) {
        if (dir === 1 ? c[k].l <= o.stop : c[k].h >= o.stop) return null
        if (tapK < 0 && (dir === 1 ? c[k].l <= o.entry : c[k].h >= o.entry)) tapK = k
        if (tapK < 0) continue
        const lvl = newest(dir === 1 ? highs : lows, k, Math.max(j, tapK - 6))
        if (!(Number.isFinite(lvl) && (dir === 1 ? c[k].c > lvl : c[k].c < lvl))) continue
        if (k < i) return null // confirmed on an earlier bar: that was the entry
        const px = c[i].c
        const risk = (px - o.stop) * dir
        if (!(risk > 0) || risk > p.maxStopAtr * a[i]) return null
        return { side: o.side, type: 'market', entry: px, stop: o.stop, target: px + dir * p.rr * risk, expiryBars: 1, setup: `${o.setup}:tap` }
      }
      return null
    }
    return null
  }
}

/** ICT session model: killzone only, session liquidity, MSS + FVG, 2R. */
function prepareICT(c: Candle[], p: Params): SignalFn {
  const a = atr(c)
  const n = c.length
  const nyMin = new Int16Array(n)
  const nyDay = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    const k = nyClock(c[i].t)
    nyMin[i] = k.min
    nyDay[i] = k.day
  }
  const levels: Level[] = dayLevels(c, (t) => nyClock(t).day, 'prev-day')
  // Asian range (20:00-00:00 NY) and London range (02:00-05:00 NY), watched until 17:00 NY.
  const session = (startMin: number, endMin: number, src: string, watchBars: number) => {
    let hi = -Infinity
    let lo = Infinity
    let open = false
    for (let i = 0; i < n; i++) {
      const m = nyMin[i]
      const inside = startMin < endMin ? m >= startMin && m < endMin : m >= startMin || m < endMin
      if (inside) {
        open = true
        if (c[i].h > hi) hi = c[i].h
        if (c[i].l < lo) lo = c[i].l
      } else if (open) {
        levels.push({ price: hi, kind: 'high', from: i - 1, until: i - 1 + watchBars, src })
        levels.push({ price: lo, kind: 'low', from: i - 1, until: i - 1 + watchBars, src })
        open = false
        hi = -Infinity
        lo = Infinity
      }
    }
  }
  session(20 * 60, 24 * 60, 'asia-range', 204)
  session(2 * 60, 5 * 60, 'london-range', 144)

  const core: SweepCore = {
    c,
    atr: a,
    st5: buildStructure(c, findSwings(c, p.ltfPivot)),
    ...splitByDir(findFVGs(c, a, p.minFvgAtr)),
    ...splitSweeps(findSweeps(c, levels, 400)),
  }
  const inKillzone = (m: number) => (m >= 120 && m < 300) || (m >= 510 && m < 660)
  return (i) => {
    if (!inKillzone(nyMin[i])) return null
    return sweepBosFvg(core, i, 1, p, 'ict') ?? sweepBosFvg(core, i, -1, p, 'ict')
  }
}

/** Widely published scalper: 9/21 EMA cross, on the right side of VWAP and the 200 EMA, RSI agreeing. */
function prepareScalper(c: Candle[], p: Params): SignalFn {
  const closes = Float64Array.from(c, (x) => x.c)
  const fast = ema(closes, p.fast)
  const slow = ema(closes, p.slow)
  const trend = ema(closes, p.trend)
  const r = rsi(closes, 14)
  const vw = vwapDaily(c)
  const a = atr(c)
  return (i) => {
    if (i < 1) return null
    const up = fast[i] > slow[i] && fast[i - 1] <= slow[i - 1]
    const dn = fast[i] < slow[i] && fast[i - 1] >= slow[i - 1]
    const px = c[i].c
    const risk = p.stopAtr * a[i]
    if (!(risk > 0)) return null
    if (up && px > vw[i] && px > trend[i] && r[i] > 50) {
      return { side: 'long', type: 'market', entry: px, stop: px - risk, target: px + p.rr * risk, expiryBars: 1, setup: 'ema-cross' }
    }
    if (dn && px < vw[i] && px < trend[i] && r[i] < 50) {
      return { side: 'short', type: 'market', entry: px, stop: px + risk, target: px - p.rr * risk, expiryBars: 1, setup: 'ema-cross' }
    }
    return null
  }
}

export const STRATEGIES: Record<StrategyId, StrategyDef> = {
  liquidity: {
    id: 'liquidity',
    name: 'Trillion Liquidity',
    blurb: 'Daily bias from the previous day\'s high and low, agreeing 1h and 15m structure, then a 5m liquidity sweep, break of structure and fair value gap entry. Target 2.5R.',
    defaults: {
      htfPivot: 2,
      mtfPivot: 3,
      ltfPivot: 2,
      sweepLookback: 36,
      fvgEntry: 0.5,
      minFvgAtr: 0.1,
      stopBufAtr: 0.1,
      minStopAtr: 0.5,
      maxStopAtr: 4,
      rr: 2.5,
      expiryBars: 12,
      dailyBias: 1,
    },
    grid: { rr: [2, 2.5, 3], fvgEntry: [0, 0.5], sweepLookback: [24, 36] },
    warmup: 1500,
    prepare: prepareLiquidity,
  },
  tap: {
    id: 'tap',
    name: 'Liquidity, tap entry (trial)',
    blurb: 'Same setup as Trillion Liquidity, but enters only after price taps the fair value gap and breaks a small swing back in the trade direction. Target 2.5R. On trial: shadow only.',
    defaults: {
      htfPivot: 2,
      mtfPivot: 3,
      ltfPivot: 2,
      sweepLookback: 36,
      fvgEntry: 0.5,
      minFvgAtr: 0.1,
      stopBufAtr: 0.1,
      minStopAtr: 0.5,
      maxStopAtr: 4,
      rr: 2.5,
      expiryBars: 12,
      dailyBias: 1,
    },
    grid: { rr: [2, 2.5, 3], sweepLookback: [24, 36] },
    warmup: 1500,
    trial: true,
    prepare: prepareTap,
  },
  ict: {
    id: 'ict',
    name: 'ICT session model',
    blurb: 'London and New York killzones only. Sweep of the Asian range or previous day, structure shift, fair value gap entry. Target 2R.',
    defaults: {
      ltfPivot: 2,
      sweepLookback: 24,
      fvgEntry: 0.5,
      minFvgAtr: 0.1,
      stopBufAtr: 0.1,
      minStopAtr: 0.5,
      maxStopAtr: 4,
      rr: 2,
      expiryBars: 12,
    },
    grid: { rr: [1.5, 2, 3], fvgEntry: [0, 0.5], sweepLookback: [12, 24] },
    warmup: 600,
    prepare: prepareICT,
  },
  scalper: {
    id: 'scalper',
    name: 'VWAP + EMA scalper',
    blurb: '9/21 EMA cross on the right side of VWAP and the 200 EMA, with RSI agreeing. ATR stop, target 2R.',
    defaults: { fast: 9, slow: 21, trend: 200, stopAtr: 1.5, rr: 2 },
    grid: { rr: [1.5, 2, 3], stopAtr: [1, 1.5, 2], slow: [21, 34] },
    warmup: 600,
    prepare: prepareScalper,
  },
}

export const STRATEGY_IDS = Object.keys(STRATEGIES) as StrategyId[]
