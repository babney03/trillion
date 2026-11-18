import { describe, expect, it } from 'vitest'
import { cfgFor, initState, isValidState, runTick, type Deps } from '../src/bot/core'
import { evidence, learn, verdict } from '../src/bot/learn'
import { tune } from '../src/bot/tune'
import type { BotMarket, JournalEntry, SourceId } from '../src/bot/types'
import { simulate } from '../src/engine/sim'
import { STRATEGIES, STRATEGY_IDS } from '../src/engine/strategies'
import type { Candle, Trade } from '../src/engine/types'
import { M5, randomWalk, T0 } from './helpers'

const N = 4200
const START = 1800
const series: Record<BotMarket, Candle[]> = { BTC: randomWalk(N, 11, 60_000), GOLD: randomWalk(N, 23, 3_900) }

interface World {
  now: number
  down: Set<string>
  scale: Record<SourceId, number>
  advance(barsForward?: number): void
  deps: Deps
}

/** A fake exchange: serves every bar closed by `now`, with switches to break each source. */
function world(startBars = START): World {
  const w: World = {
    now: T0 + startBars * M5 + 1_000,
    down: new Set<string>(),
    scale: { hyperliquid: 1, binance: 1 },
    advance(barsForward = 1) {
      w.now += barsForward * M5
    },
    deps: {
      now: () => w.now,
      candles: async (market, source) => {
        if (w.down.has(source) || w.down.has(`${market}:${source}`)) throw new Error('responded 503')
        const k = w.scale[source]
        return series[market].filter((b) => b.t + M5 <= w.now).map((b) => ({ ...b, o: b.o * k, h: b.h * k, l: b.l * k, c: b.c * k }))
      },
    },
  }
  return w
}

async function run(w: World, ticks: number, step = 1, state = initState(w.now), journal: JournalEntry[] = []) {
  for (let k = 0; k < ticks; k++) {
    await runTick(state, journal, w.deps)
    w.advance(step)
  }
  return { state, journal }
}

const key = (t: Trade) => `${t.side}@${t.entryT}>${t.exitT}:${t.r.toFixed(6)}:${t.reason}`

describe('bot cycle', () => {
  it('opens nothing on its very first cycle, then trades exactly what the backtest trades', async () => {
    const w = world()
    const { state, journal } = await run(w, 1)
    expect(journal).toHaveLength(0)
    expect(state.markets.GOLD.lastBarT).toBe(series.GOLD[START - 1].t)

    await run(w, N - START, 1, state, journal)
    for (const market of ['GOLD', 'BTC'] as const) {
      for (const id of STRATEGY_IDS) {
        const def = STRATEGIES[id]
        const bt = simulate(series[market], def.prepare(series[market], def.defaults, M5), cfgFor(market), { from: START, to: N })
        const expected = bt.trades.filter((t) => t.reason !== 'end').map(key)
        const got = journal.filter((j) => j.track === `${market}:${id}`).map(key)
        expect(got).toEqual(expected)
      }
    }
    expect(journal.length).toBeGreaterThan(20)
    expect(state.ticks).toBe(N - START + 1)
  })

  it('replays missed bars after an outage and ends in the same place', async () => {
    const a = world()
    const steady = await run(a, N - START + 1)
    const b = world()
    const gappy = await run(b, Math.ceil((N - START + 1) / 37) + 1, 37)
    expect(gappy.journal.map(key).sort()).toEqual(steady.journal.map(key).sort())
    expect(gappy.state.incidents.some((i) => /caught up \d+ bars/.test(i.msg) && i.healed)).toBe(true)
  })

  it('paper equity moves only on taken trades and every trade is journalled with its context', async () => {
    const w = world()
    const { state, journal } = await run(w, 1200)
    const taken = journal.filter((j) => j.taken)
    expect(taken.length).toBeGreaterThan(0)
    expect(journal.some((j) => !j.taken)).toBe(true)
    expect(state.equity).toBeCloseTo(state.startEquity + taken.reduce((s, j) => s + j.pnl, 0), 6)
    expect(journal.every((j) => j.ctx && j.id && (j.taken || j.note))).toBe(true)
    for (const j of journal.filter((x) => !x.taken)) expect(j.pnl).toBe(0)
  })

  it('never holds two paper positions in one market at once', async () => {
    const w = world()
    const { journal } = await run(w, 1200)
    for (const market of ['BTC', 'GOLD']) {
      const t = journal.filter((j) => j.taken && j.market === market).sort((a, b) => a.entryT - b.entryT)
      for (let i = 1; i < t.length; i++) expect(t[i].entryT).toBeGreaterThanOrEqual(t[i - 1].exitT)
    }
  })
})

describe('upgrades', () => {
  it('a track saved before a rule was added picks up its default', async () => {
    const w = world()
    const state = initState(w.now)
    delete (state.tracks['GOLD:liquidity'].params as Record<string, number>).dailyBias
    await runTick(state, [], w.deps)
    expect(state.tracks['GOLD:liquidity'].params.dailyBias).toBe(1)
  })
})

describe('self-healing', () => {
  it('falls back to the second source, records it, and returns to the first when it recovers', async () => {
    const w = world()
    const { state, journal } = await run(w, 3)
    w.down.add('hyperliquid')
    await run(w, 3, 1, state, journal)
    expect(state.markets.BTC.source).toBe('binance')
    expect(state.incidents.some((i) => /price source changed from hyperliquid to binance/.test(i.msg))).toBe(true)
    expect(state.markets.BTC.lastBarT).toBe(series.BTC[START + 4].t) // still advancing
    w.down.clear()
    await run(w, 1, 1, state, journal)
    expect(state.markets.BTC.source).toBe('hyperliquid')
  })

  it('moves open levels onto the new source when the two quote different prices', async () => {
    const w = world()
    const { state, journal } = await run(w, 1)
    // Run until some track holds a position.
    let held
    for (let k = 0; k < 2000 && !held; k++) {
      await run(w, 1, 1, state, journal)
      held = Object.values(state.tracks).find((t) => t.sim.position)
    }
    expect(held).toBeTruthy()
    const before = { ...held!.sim.position! }
    w.scale.binance = 1.001
    w.down.add('hyperliquid')
    // Rebase happens on the switch; stop the comparison there (the position may also close this bar).
    const s2 = structuredClone(state)
    await runTick(s2, [], w.deps)
    const after = s2.tracks[held!.id].sim.position
    if (after) {
      expect(after.stop).toBeCloseTo(before.stop * 1.001, 6)
      expect(after.target).toBeCloseTo(before.target * 1.001, 6)
      expect(after.qty * after.riskPerUnit).toBeCloseTo(before.qty * before.riskPerUnit, 6)
    }
    expect(s2.incidents.some((i) => /Open levels moved 0\.100%/.test(i.msg))).toBe(true)
  })

  it('holds still when no source works, then reports the recovery', async () => {
    const w = world()
    const { state, journal } = await run(w, 2)
    const lastBar = state.markets.GOLD.lastBarT
    w.down.add('hyperliquid').add('binance')
    await run(w, 4, 1, state, journal)
    expect(state.markets.GOLD.failures).toBe(4)
    expect(state.markets.GOLD.lastBarT).toBe(lastBar)
    expect(state.incidents.filter((i) => i.level === 'error' && !i.healed)).toHaveLength(2) // one per market, repeats collapsed
    w.down.clear()
    await run(w, 1, 1, state, journal)
    expect(state.markets.GOLD.failures).toBe(0)
    expect(state.incidents.some((i) => /GOLD: price data is back after 4 failed cycles/.test(i.msg))).toBe(true)
    expect(state.incidents.some((i) => /GOLD: caught up 5 bars/.test(i.msg))).toBe(true)
  })

  it('rejects stale data instead of trading on it', async () => {
    const w = world()
    const { state } = await run(w, 1)
    const frozen = w.deps.candles
    const cutoff = w.now
    w.deps.candles = async (m, src, n) => (await frozen(m, src, n)).filter((b) => b.t + M5 <= cutoff)
    w.advance(6)
    await runTick(state, [], w.deps)
    expect(state.incidents.some((i) => /stale by \d+ min/.test(i.msg) && i.level === 'error')).toBe(true)
  })

  it('recognises a corrupted state', () => {
    const good = initState(T0)
    expect(isValidState(good)).toBe(true)
    expect(isValidState(JSON.parse(JSON.stringify(good)))).toBe(true)
    expect(isValidState({ ...good, equity: NaN })).toBe(false)
    expect(isValidState({ ...good, tracks: {} })).toBe(false)
    expect(isValidState(null)).toBe(false)
  })
})

describe('learning', () => {
  const trade = (r: number, over: Partial<Trade> = {}): Trade => ({
    side: 'long', setup: 't', entryT: T0, exitT: T0 + M5, entry: 100, exit: 100, stop: 99, target: 102, qty: 1,
    pnl: r * 50, fees: 0, r, reason: r > 0 ? 'target' : 'stop', bars: 1, taken: true, ctx: { session: 'asia', vol: 'normal' }, ...over,
  })

  it('needs enough evidence before deciding anything', () => {
    expect(verdict([-1, -1, -1, -1], 15)).toBe('unclear')
    expect(verdict(Array(15).fill(-1), 15)).toBe('negative')
    expect(verdict(Array(15).fill(0.4), 15)).toBe('positive')
    expect(verdict([2.5, -1, -1, 2.5, -1, -1, -1, 2.5, -1, -1, -1, 2.5, -1, -1, -1], 15)).toBe('unclear') // slightly negative, well within noise
    expect(evidence([1, -1]).mean).toBe(0)
  })

  it('benches a track that keeps losing, keeps scoring it in shadow, and restores it when it recovers', () => {
    const track = initState(T0).tracks['GOLD:liquidity']
    const log: string[] = []
    for (let k = 0; k < 15; k++) log.push(...learn(track, trade(-1, { ctx: { session: k % 2 ? 'london' : 'newyork', vol: 'normal' }, side: k % 2 ? 'long' : 'short' }), T0).map((l) => l.kind))
    expect(track.status).toBe('benched')
    expect(log).toContain('bench')
    for (let k = 0; k < 40; k++) learn(track, trade(k % 2 ? 2.5 : -1, { taken: false, pnl: 0 }), T0)
    expect(track.status).toBe('active')
    expect(track.takenN).toBe(15)
    expect(track.n).toBe(55)
  })

  it('switches off a losing context without benching the whole strategy', () => {
    const track = initState(T0).tracks['GOLD:liquidity']
    const kinds: string[] = []
    for (let k = 0; k < 12; k++) {
      kinds.push(...learn(track, trade(-1, { ctx: { session: 'asia', vol: 'normal' }, taken: false, pnl: 0 }), T0).map((l) => l.kind))
      kinds.push(...learn(track, trade(2.5, { ctx: { session: 'newyork', vol: 'high' }, side: 'short', taken: false, pnl: 0 }), T0).map((l) => l.kind))
    }
    expect(track.status).toBe('active')
    expect(Object.keys(track.benchedBuckets).sort()).toEqual(['session:asia', 'side:long', 'vol:normal'])
    expect(kinds).toContain('context-off')
  })

  it('cools off after three straight paper losses', () => {
    const track = initState(T0).tracks['BTC:liquidity']
    const out = [1, 2, 3].flatMap(() => learn(track, trade(-1), T0))
    expect(track.cooldownUntil).toBe(T0 + M5 + 2 * 3_600_000)
    expect(out.some((l) => l.kind === 'guard')).toBe(true)
  })

  it('stops opening paper trades for the day after the daily loss limit', async () => {
    const w = world()
    const state = initState(w.now)
    const journal: JournalEntry[] = []
    const tick = async () => {
      w.advance()
      state.day.key = Math.floor(w.now / 86_400_000) // keep it one "day" for the test
      await runTick(state, journal, w.deps)
    }
    await runTick(state, journal, w.deps)
    state.day.startEquity = state.equity / 0.97 // already 3% down on the day
    for (let k = 0; k < 1500 && !state.day.halted; k++) await tick()
    expect(state.day.halted).toBe(true)
    expect(state.lessons.some((l) => l.kind === 'guard' && /Daily loss limit/.test(l.msg))).toBe(true)
    const haltT = journal[journal.length - 1].exitT
    for (let j = 0; j < 500; j++) await tick()
    // Orders already resting when the limit hit may still fill; nothing new may be taken after that.
    expect(journal.filter((x) => x.taken && x.entryT > haltT + 13 * M5)).toHaveLength(0)
    expect(journal.some((x) => !x.taken && x.note === 'daily loss limit reached')).toBe(true)
  })

  it('re-tune never adopts settings that fail on unseen bars', () => {
    const c = randomWalk(9000, 5, 3900)
    const def = STRATEGIES.scalper
    const res = tune(c, 'scalper', def.defaults, cfgFor('GOLD'))
    expect(res.msg.length).toBeGreaterThan(10)
    if (res.adopt) {
      const from = def.warmup + Math.floor((c.length - def.warmup) * 0.7)
      const val = (p: typeof def.defaults) => {
        const r = simulate(c, def.prepare(c, p, M5), cfgFor('GOLD'), { from })
        return r.trades.reduce((s, t) => s + t.r, 0) / Math.max(1, r.trades.length)
      }
      expect(val(res.params)).toBeGreaterThan(val(def.defaults))
    } else expect(res.params).toEqual(def.defaults)
  })
})
