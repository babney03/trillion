import { describe, expect, it } from 'vitest'
import { aggregate, atr, ema, rsi } from '../src/engine/indicators'
import { buildStructure, dayLevels, findFVGs, findSwings, findSweeps, latestIn } from '../src/engine/structure'
import { nyClock } from '../src/engine/time'
import { emptyTrack, simulate, stepBar } from '../src/engine/sim'
import { monteCarlo, summarize, buyHold } from '../src/engine/metrics'
import { STRATEGIES, STRATEGY_IDS } from '../src/engine/strategies'
import { gridCombos, runBacktest, walkForward } from '../src/engine/backtest'
import { DEFAULT_CFG, withCosts, type OrderIntent, type SimCfg } from '../src/engine/types'
import { bars, M5, randomWalk, T0 } from './helpers'

const flat = (p: number) => [p, p + 0.5, p - 0.5, p]
const NOFEE: SimCfg = { ...DEFAULT_CFG, makerBps: 0, takerBps: 0, slipBps: 0, riskPct: 0.01, maxCostR: Infinity }

describe('indicators', () => {
  it('ema of a constant is that constant', () => {
    expect(Array.from(ema([5, 5, 5, 5], 3))).toEqual([5, 5, 5, 5])
  })
  it('atr uses true range including gaps', () => {
    const c = bars([[10, 11, 9, 10], [14, 15, 13, 14]])
    expect(atr(c, 14)[1]).toBeCloseTo((2 + 5) / 2)
  })
  it('rsi is 100 when price only rises', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i)
    expect(rsi(closes, 14)[29]).toBe(100)
  })
  it('aggregate never exposes a higher-timeframe bar before it closes', () => {
    const c = bars(Array.from({ length: 30 }, (_, i) => flat(100 + i)))
    const h = aggregate(c, 900_000, M5)
    expect(h.lastComplete[0]).toBe(-1)
    expect(h.lastComplete[1]).toBe(-1)
    expect(h.lastComplete[2]).toBe(0) // third 5m bar completes the first 15m bar
    expect(h.lastComplete[3]).toBe(0)
    expect(h.closeIdx[0]).toBe(2)
    expect(h.candles[0].c).toBe(102)
  })
})

describe('time', () => {
  it('converts to New York time across daylight saving', () => {
    expect(nyClock(Date.UTC(2026, 6, 1, 12)).min).toBe(8 * 60) // EDT
    expect(nyClock(Date.UTC(2026, 0, 15, 12)).min).toBe(7 * 60) // EST
    expect(nyClock(Date.UTC(2026, 2, 8, 7)).min).toBe(3 * 60) // clocks have just sprung forward
  })
})

describe('structure', () => {
  // swing high at bar 2 (h=13), swing low at bar 5 (l=8)
  const c = bars([
    [10, 10.5, 9.5, 10],
    [10, 11.5, 10, 11],
    [11, 13, 11, 12],
    [12, 12.2, 10.5, 11],
    [11, 11.2, 9.5, 10],
    [10, 10.2, 8, 9],
    [9, 10.5, 9, 10],
    [10, 11.5, 10, 11],
    [11, 14, 11, 13.5],
  ])
  it('finds pivots and records when they become knowable', () => {
    const s = findSwings(c, 2)
    expect(s).toContainEqual({ i: 2, price: 13, kind: 'high', confirmedAt: 4 })
    expect(s).toContainEqual({ i: 5, price: 8, kind: 'low', confirmedAt: 7 })
  })
  it('flags a break of structure on the bar that closes beyond the swing', () => {
    const st = buildStructure(c, findSwings(c, 2))
    expect(st.events).toEqual([{ i: 8, dir: 1, level: 13, swingI: 2, flip: false }])
    expect(st.trend[7]).toBe(0)
    expect(st.trend[8]).toBe(1)
  })
  it('detects a bullish fair value gap between bar 1 high and bar 3 low', () => {
    const g = bars([[10, 11, 9.5, 10.8], [10.8, 13, 10.7, 12.9], [12.9, 13.5, 12, 13.2]])
    expect(findFVGs(g, [1, 1, 1], 0.1)).toEqual([{ i: 2, dir: 1, top: 12, bottom: 11 }])
    expect(findFVGs(g, [20, 20, 20], 0.1)).toEqual([]) // too small relative to ATR
  })
  it('a wick through a low that closes back above is a sweep', () => {
    const s = bars([flat(100), flat(100), [100, 100.2, 98.5, 99.8], flat(100)])
    const out = findSweeps(s, [{ price: 99, kind: 'low', from: 0, src: 't' }])
    expect(out).toEqual([{ i: 2, i0: 2, kind: 'low', level: 99, extreme: 98.5, src: 't' }])
  })
  it('acceptance below a low is a break, not a sweep', () => {
    const rows = [flat(100), [100, 100, 98, 98.2], flat(98), flat(98), flat(98), [98, 100, 98, 99.9]]
    expect(findSweeps(bars(rows), [{ price: 99, kind: 'low', from: 0, src: 't' }])).toEqual([])
  })
  it('a level cannot be swept by the bar that created it', () => {
    const s = bars([flat(100), [100, 100.2, 98.5, 99.8]])
    expect(findSweeps(s, [{ price: 99, kind: 'low', from: 1, src: 't' }])).toEqual([])
  })
  it('previous-day levels start at the day boundary', () => {
    const day = 288
    const c2 = bars(Array.from({ length: day + 2 }, (_, i) => flat(i === 100 ? 120 : 100)))
    const lv = dayLevels(c2, (t) => Math.floor(t / 86_400_000), 'pd')
    expect(lv[0]).toMatchObject({ price: 120.5, kind: 'high', from: day - 1 })
  })
  it('latestIn respects both bounds', () => {
    const arr = [{ i: 2 }, { i: 5 }, { i: 9 }]
    expect(latestIn(arr, 3, 8)).toEqual({ i: 5 })
    expect(latestIn(arr, 6, 8)).toBeNull()
  })
})

describe('simulator', () => {
  const once = (intent: OrderIntent) => {
    let used = false
    return (i: number) => (i === 0 && !used ? ((used = true), intent) : null)
  }
  const longLimit: OrderIntent = { side: 'long', type: 'limit', entry: 99, stop: 98, target: 101.5, expiryBars: 3, setup: 't' }

  it('fills a resting limit, then exits at target for +2.5R', () => {
    const c = bars([flat(100), [100, 100.2, 98.9, 99.5], [99.5, 102, 99.4, 101.8]])
    const r = simulate(c, once(longLimit), NOFEE)
    expect(r.trades).toHaveLength(1)
    expect(r.trades[0]).toMatchObject({ entry: 99, exit: 101.5, reason: 'target' })
    expect(r.trades[0].r).toBeCloseTo(2.5)
    expect(r.endEquity).toBeCloseTo(10_000 * (1 + 0.01 * 2.5))
  })
  it('assumes the stop was hit first when a bar touches both stop and target', () => {
    const c = bars([flat(100), [100, 100.2, 98.9, 99.5], [99.5, 102, 97.5, 101]])
    const t = simulate(c, once(longLimit), NOFEE).trades[0]
    expect(t.reason).toBe('stop')
    expect(t.r).toBeCloseTo(-1)
  })
  it('on the entry bar, a touch of target does not count unless the bar closes beyond it', () => {
    const c = bars([flat(100), [100, 102, 98.9, 100], flat(100)])
    const r = simulate(c, once(longLimit), NOFEE)
    expect(r.trades[0].reason).toBe('end') // still open at the end, not a win
  })
  it('stops out on the entry bar when the bar trades through the stop', () => {
    const c = bars([flat(100), [100, 100.2, 97.9, 99], flat(99)])
    expect(simulate(c, once(longLimit), NOFEE).trades[0].reason).toBe('stop')
  })
  it('cancels an unfilled limit after its expiry', () => {
    const c = bars([flat(100), flat(100), flat(100), flat(100), [100, 100, 98.9, 99.5], flat(99.5)])
    expect(simulate(c, once(longLimit), NOFEE).trades).toHaveLength(0)
  })
  it('cancels when price runs to target without filling', () => {
    const c = bars([flat(100), [100, 102, 99.6, 101.8], [101.8, 101.9, 98.9, 99.5], flat(99.5)])
    expect(simulate(c, once(longLimit), NOFEE).trades).toHaveLength(0)
  })
  it('fills market orders at the next open with slippage and charges fees both ways', () => {
    const cfg: SimCfg = { ...DEFAULT_CFG, makerBps: 2, takerBps: 10, slipBps: 10, riskPct: 0.01, maxCostR: Infinity }
    const c = bars([flat(100), [100, 100.5, 99.8, 100.2], [100.2, 103, 100.1, 102.5]])
    const mkt: OrderIntent = { side: 'long', type: 'market', entry: 100, stop: 99, target: 102, expiryBars: 1, setup: 't' }
    const t = simulate(c, once(mkt), cfg).trades[0]
    expect(t.entry).toBeCloseTo(100.1)
    expect(t.exit).toBe(102)
    const risk = 100.1 - 99
    expect(t.r).toBeCloseTo((102 - 100.1 - 100.1 * 0.001 - 102 * 0.0002) / risk) // taker in, maker out at target
    expect(t.pnl).toBeCloseTo(t.r * 10_000 * 0.01)
  })
  it('mirrors correctly for shorts', () => {
    const short: OrderIntent = { side: 'short', type: 'limit', entry: 101, stop: 102, target: 99, expiryBars: 3, setup: 't' }
    const c = bars([flat(100), [100, 101.1, 99.9, 100.5], [100.5, 100.6, 98.5, 98.8]])
    const t = simulate(c, once(short), NOFEE).trades[0]
    expect(t).toMatchObject({ side: 'short', entry: 101, exit: 99, reason: 'target' })
    expect(t.r).toBeCloseTo(2)
  })
  it('shadow trades track R but never touch equity', () => {
    const c = bars([flat(100), [100, 100.2, 98.9, 99.5], [99.5, 102, 99.4, 101.8]])
    const st = emptyTrack()
    let equity = 10_000
    const sig = once(longLimit)
    const closed = []
    for (let i = 0; i < c.length; i++) {
      const r = stepBar(st, c, i, sig, NOFEE, { equity: () => equity, gate: () => ({ take: false, note: 'benched' }) })
      if (r.closed) {
        equity += r.closed.pnl
        closed.push(r.closed)
      }
    }
    expect(closed[0]).toMatchObject({ taken: false, qty: 0, pnl: 0, note: 'benched' })
    expect(closed[0].r).toBeCloseTo(2.5)
    expect(equity).toBe(10_000)
  })
  it('caps position size at max leverage', () => {
    const tight: OrderIntent = { ...longLimit, stop: 98.999, target: 99.01 }
    const c = bars([flat(100), [100, 100.2, 98.9, 99.5], flat(99.5)])
    const st = emptyTrack()
    let filled
    for (let i = 0; i < 2; i++) filled = stepBar(st, c, i, once(tight), NOFEE, { equity: () => 10_000 }).filled ?? filled
    expect(st.position ?? filled).toBeTruthy()
    expect((st.position ?? filled)!.qty * 99).toBeCloseTo(10_000 * NOFEE.maxLeverage)
  })
})

describe('metrics', () => {
  const mk = (r: number, exitT: number) => ({
    side: 'long' as const, setup: 't', entryT: exitT - M5, exitT, entry: 100, exit: 100, stop: 99, target: 102,
    qty: 1, pnl: r * 100, fees: 1, r, reason: 'target' as const, bars: 2, taken: true,
  })
  it('summarises wins, drawdown and expectancy', () => {
    const m = summarize([mk(2, T0), mk(-1, T0 + M5), mk(-1, T0 + 2 * M5), mk(2, T0 + 3 * M5)], 10_000, T0, T0 + 86_400_000)
    expect(m.trades).toBe(4)
    expect(m.winRate).toBe(0.5)
    expect(m.expectancyR).toBeCloseTo(0.5)
    expect(m.profitFactor).toBeCloseTo(2)
    expect(m.netPct).toBeCloseTo(2)
    expect(m.maxDDPct).toBeCloseTo((200 / 10_200) * 100)
  })
  it('monte carlo is reproducible and ordered', () => {
    const rs = [2, -1, -1, 2.5, -1, 2, -1, -1]
    const a = monteCarlo(rs, 0.01)!
    expect(a).toEqual(monteCarlo(rs, 0.01))
    expect(a.netPct.p5).toBeLessThanOrEqual(a.netPct.p50)
    expect(a.netPct.p50).toBeLessThanOrEqual(a.netPct.p95)
    expect(monteCarlo([1, 2], 0.01)).toBeNull()
  })
  it('buy and hold pays the fee both ways', () => {
    const c = bars([flat(100), flat(110)])
    const bh = buyHold(c, 0, 2, 10_000, { ...DEFAULT_CFG, takerBps: 100 })
    expect(bh.netPct).toBeCloseTo(((110 * 0.99) / (100 * 1.01) - 1) * 100)
  })
})

describe('strategies', () => {
  const c = randomWalk(6000, 42)
  for (const id of STRATEGY_IDS) {
    const def = STRATEGIES[id]
    it(`${id}: produces orders with stop and target on the correct sides`, () => {
      const sig = def.prepare(c, def.defaults, M5)
      let n = 0
      for (let i = 0; i < c.length; i++) {
        const o = sig(i)
        if (!o) continue
        n++
        const dir = o.side === 'long' ? 1 : -1
        expect((o.entry - o.stop) * dir).toBeGreaterThan(0)
        expect((o.target - o.entry) * dir).toBeGreaterThan(0)
        if (o.type === 'limit') expect((c[i].c - o.entry) * dir).toBeGreaterThan(0)
      }
      expect(n).toBeGreaterThan(def.trial ? 0 : 3) // the trial entry is rare by design
    })
    it(`${id}: has no lookahead (a signal never changes when later bars are added)`, () => {
      const full = def.prepare(c, def.defaults, M5)
      let compared = 0
      for (let end = def.warmup; end <= c.length; end += 137) {
        const part = def.prepare(c.slice(0, end), def.defaults, M5)
        for (let i = Math.max(0, end - 20); i < end; i++) {
          expect(part(i)).toEqual(full(i))
          compared++
        }
      }
      expect(compared).toBeGreaterThan(200)
    })
  }
  it('target is the configured multiple of risk', () => {
    const def = STRATEGIES.liquidity
    const sig = def.prepare(c, def.defaults, M5)
    for (let i = 0; i < c.length; i++) {
      const o = sig(i)
      if (o) expect(Math.abs(o.target - o.entry) / Math.abs(o.entry - o.stop)).toBeCloseTo(2.5)
    }
  })
})

describe('backtest', () => {
  const c = randomWalk(8000, 7)
  it('splits in-sample and out-of-sample without losing trades', () => {
    const r = runBacktest(c, 'scalper', {}, withCosts('futures'))
    expect(r.inSample.trades + r.outOfSample.trades).toBe(r.all.trades)
    expect(r.all.trades).toBeGreaterThan(10)
    expect(r.trades.every((t) => t.ctx)).toBe(true)
  })
  it('costs make results worse, never better', () => {
    const free = runBacktest(c, 'scalper', {}, { ...withCosts('zero'), maxCostR: Infinity })
    const paid = runBacktest(c, 'scalper', {}, { ...withCosts('perp'), maxCostR: Infinity })
    expect(paid.all.trades).toBe(free.all.trades)
    expect(paid.all.totalR).toBeLessThan(free.all.totalR)
  })
  it('skips trades whose costs would eat too much of the risk', () => {
    const loose = runBacktest(c, 'scalper', {}, { ...withCosts('perp'), maxCostR: Infinity })
    const strict = runBacktest(c, 'scalper', {}, { ...withCosts('perp'), maxCostR: 0.25 })
    expect(strict.all.trades).toBeLessThan(loose.all.trades)
    const cost = (t: (typeof strict.trades)[number]) => (t.entry * (4.5 + 1 + 4.5 + 1)) / 1e4 / Math.abs(t.entry - t.stop)
    // Stops are set from the signal close; allow a little drift from the next-bar fill.
    for (const t of strict.trades) expect(cost(t)).toBeLessThan(0.25 * 1.2)
  })
  it('walk-forward only scores bars it did not tune on', () => {
    const wf = walkForward(c, 'scalper', withCosts('futures'), { trainBars: 3000, testBars: 1000 })
    expect(wf.windows.length).toBe(4)
    for (const w of wf.windows) expect(w.testFromT).toBeGreaterThan(w.trainFromT)
    expect(wf.combos).toBe(gridCombos(STRATEGIES.scalper.grid).length)
    expect(wf.oos.trades).toBe(wf.windows.reduce((a, w) => a + w.testTrades, 0))
  })
})
