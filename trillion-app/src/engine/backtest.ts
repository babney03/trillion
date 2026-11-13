import type { Candle, Params, SimCfg, Trade } from './types'
import { STRATEGIES, type StrategyId } from './strategies'
import { simulate } from './sim'
import { buyHold, monteCarlo, summarize, type BuyHold, type Metrics, type MonteCarlo } from './metrics'
import { contextFn } from './context'

export interface BacktestResult {
  strategy: StrategyId
  params: Params
  bars: number
  startT: number
  endT: number
  trades: Trade[]
  equity: { t: number; v: number }[]
  all: Metrics
  /** First 70% of the tested bars. */
  inSample: Metrics
  /** Last 30% of the tested bars, scored on its own. */
  outOfSample: Metrics
  splitT: number
  buyHold: BuyHold
  monteCarlo: MonteCarlo | null
}

export function runBacktest(
  c: Candle[],
  strategy: StrategyId,
  params: Params,
  cfg: SimCfg,
  startEquity = 10_000,
): BacktestResult {
  const def = STRATEGIES[strategy]
  const p = { ...def.defaults, ...params }
  const from = Math.min(def.warmup, Math.max(0, c.length - 2))
  const sim = simulate(c, def.prepare(c, p, cfg.tfMs), cfg, { from, startEquity, ctx: contextFn(c) })
  const startT = c[from].t
  const endT = c[c.length - 1].t
  const splitT = c[from + Math.floor((c.length - from) * 0.7)].t
  const ins = sim.trades.filter((t) => t.exitT < splitT)
  const oos = sim.trades.filter((t) => t.exitT >= splitT)
  const insEnd = startEquity + ins.reduce((a, t) => a + t.pnl, 0)
  return {
    strategy,
    params: p,
    bars: c.length - from,
    startT,
    endT,
    trades: sim.trades,
    equity: sim.equity,
    all: summarize(sim.trades, startEquity, startT, endT),
    inSample: summarize(ins, startEquity, startT, splitT),
    outOfSample: summarize(oos, insEnd, splitT, endT),
    splitT,
    buyHold: buyHold(c, from, c.length, startEquity, cfg),
    monteCarlo: monteCarlo(sim.trades.map((t) => t.r), cfg.riskPct),
  }
}

export interface WalkWindow {
  trainFromT: number
  testFromT: number
  testToT: number
  params: Params
  trainTrades: number
  trainExpR: number
  testTrades: number
  testExpR: number
}

export interface WalkForward {
  windows: WalkWindow[]
  /** Every out-of-sample trade, stitched together. */
  oos: Metrics
  /** Out-of-sample expectancy as a share of in-sample expectancy. Near or above 0.5 is healthy. */
  efficiency: number
  combos: number
}

export function gridCombos(grid: Record<string, number[]>): Params[] {
  let out: Params[] = [{}]
  for (const [k, vals] of Object.entries(grid)) {
    out = out.flatMap((base) => vals.map((v) => ({ ...base, [k]: v })))
  }
  return out
}

/**
 * Tune on a window, score on the next unseen window, slide forward, repeat.
 * The objective is total R with a minimum trade count, which resists picking
 * a parameter set that got lucky on three trades.
 */
export function walkForward(
  c: Candle[],
  strategy: StrategyId,
  cfg: SimCfg,
  opts: { trainBars: number; testBars: number; minTrades?: number; onProgress?: (done: number, total: number) => void },
): WalkForward {
  const def = STRATEGIES[strategy]
  const combos = gridCombos(def.grid).map((g) => ({ ...def.defaults, ...g }))
  const signals = combos.map((p) => def.prepare(c, p, cfg.tfMs))
  const minTrades = opts.minTrades ?? 8
  const windows: WalkWindow[] = []
  const oosTrades: Trade[] = []
  let trainR = 0
  let trainN = 0
  const starts: number[] = []
  for (let a = def.warmup; a + opts.trainBars + opts.testBars <= c.length; a += opts.testBars) starts.push(a)
  starts.forEach((a, w) => {
    const b = a + opts.trainBars
    const e = b + opts.testBars
    let best = -1
    let bestScore = -Infinity
    let bestN = 0
    signals.forEach((sig, k) => {
      const r = simulate(c, sig, cfg, { from: a, to: b })
      const total = r.trades.reduce((s, t) => s + t.r, 0)
      if (r.trades.length >= minTrades && total > bestScore) {
        bestScore = total
        best = k
        bestN = r.trades.length
      }
    })
    if (best < 0) {
      best = 0 // not enough evidence to prefer anything: keep defaults
      const r = simulate(c, signals[0], cfg, { from: a, to: b })
      bestScore = r.trades.reduce((s, t) => s + t.r, 0)
      bestN = r.trades.length
    }
    const test = simulate(c, signals[best], cfg, { from: b, to: e })
    oosTrades.push(...test.trades)
    trainR += bestScore
    trainN += bestN
    const testR = test.trades.reduce((s, t) => s + t.r, 0)
    windows.push({
      trainFromT: c[a].t,
      testFromT: c[b].t,
      testToT: c[e - 1].t,
      params: combos[best],
      trainTrades: bestN,
      trainExpR: bestN ? bestScore / bestN : 0,
      testTrades: test.trades.length,
      testExpR: test.trades.length ? testR / test.trades.length : 0,
    })
    opts.onProgress?.(w + 1, starts.length)
  })
  const oos = summarize(
    oosTrades,
    10_000,
    windows[0]?.testFromT ?? 0,
    windows[windows.length - 1]?.testToT ?? 0,
  )
  const trainExp = trainN ? trainR / trainN : 0
  return {
    windows,
    oos,
    efficiency: trainExp > 0 ? oos.expectancyR / trainExp : 0,
    combos: combos.length,
  }
}
