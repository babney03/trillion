import { gridCombos } from '../engine/backtest'
import { simulate } from '../engine/sim'
import { STRATEGIES, type StrategyId } from '../engine/strategies'
import type { Candle, Params, SimCfg } from '../engine/types'

export interface TuneResult {
  adopt: boolean
  params: Params
  msg: string
}

const describe = (p: Params, keys: string[]) => keys.map((k) => `${k}=${p[k]}`).join(', ')

/**
 * Weekly re-tune. Pick the best parameter set on the older 70% of recent
 * history, then let it replace the current one only if it also beats it on the
 * newest 30%, which neither was chosen on.
 */
export function tune(c: Candle[], strategy: StrategyId, current: Params, cfg: SimCfg): TuneResult {
  const def = STRATEGIES[strategy]
  const keys = Object.keys(def.grid)
  const from = def.warmup
  const split = from + Math.floor((c.length - from) * 0.7)
  if (c.length - from < 2000) return { adopt: false, params: current, msg: 'not enough history to re-tune' }
  const score = (p: Params, a: number, b: number) => {
    const r = simulate(c, def.prepare(c, p, cfg.tfMs), cfg, { from: a, to: b })
    const total = r.trades.reduce((s, t) => s + t.r, 0)
    return { n: r.trades.length, total, exp: r.trades.length ? total / r.trades.length : 0 }
  }
  const same = (a: Params, b: Params) => keys.every((k) => a[k] === b[k])
  const incTrain = score(current, from, split)
  let best: Params | null = null
  let bestTrain = { n: 0, total: -Infinity, exp: 0 }
  for (const g of gridCombos(def.grid)) {
    const p = { ...current, ...g }
    if (same(p, current)) continue
    const s = score(p, from, split)
    if (s.n >= 8 && s.total > bestTrain.total) {
      best = p
      bestTrain = s
    }
  }
  if (!best || bestTrain.total <= incTrain.total) {
    return { adopt: false, params: current, msg: `kept ${describe(current, keys)}: no alternative did better on the tuning window` }
  }
  const incVal = score(current, split, c.length)
  const val = score(best, split, c.length)
  const f = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}R`
  if (val.n >= 4 && val.exp > 0 && val.exp > incVal.exp + 0.05) {
    return {
      adopt: true,
      params: best,
      msg: `switched to ${describe(best, keys)}: ${f(val.exp)} over ${val.n} unseen trades against ${f(incVal.exp)} for the old settings`,
    }
  }
  return {
    adopt: false,
    params: current,
    msg: `kept ${describe(current, keys)}: the challenger (${describe(best, keys)}) won on the tuning window but not on unseen bars (${f(val.exp)} over ${val.n} trades against ${f(incVal.exp)})`,
  }
}
