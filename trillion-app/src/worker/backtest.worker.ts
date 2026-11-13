/// <reference lib="webworker" />
import { runBacktest, walkForward } from '../engine/backtest'
import type { StrategyId } from '../engine/strategies'
import type { Candle, Params, SimCfg } from '../engine/types'

export type WorkerIn =
  | { id: number; kind: 'run'; candles: Candle[]; strategy: StrategyId; params: Params; cfg: SimCfg }
  | { id: number; kind: 'walk'; candles: Candle[]; strategy: StrategyId; cfg: SimCfg; trainBars: number; testBars: number }

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const m = e.data
  try {
    if (m.kind === 'run') {
      self.postMessage({ id: m.id, kind: 'result', result: runBacktest(m.candles, m.strategy, m.params, m.cfg) })
    } else {
      const result = walkForward(m.candles, m.strategy, m.cfg, {
        trainBars: m.trainBars,
        testBars: m.testBars,
        onProgress: (done, total) => self.postMessage({ id: m.id, kind: 'progress', done, total }),
      })
      self.postMessage({ id: m.id, kind: 'walk', result })
    }
  } catch (err) {
    self.postMessage({ id: m.id, kind: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
