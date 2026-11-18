import { sanitize } from '../data/candles'
import { contextFn } from '../engine/context'
import { emptyTrack, stepBar, type StepHooks } from '../engine/sim'
import { STRATEGIES, STRATEGY_IDS, type StrategyId } from '../engine/strategies'
import { DEFAULT_CFG, withCosts, type Candle, type SimCfg } from '../engine/types'
import { learn } from './learn'
import { tune } from './tune'
import {
  BOT,
  BOT_COSTS,
  BOT_MARKETS,
  SOURCES,
  type BotMarket,
  type BotState,
  type Incident,
  type JournalEntry,
  type Lesson,
  type SourceId,
  type Track,
} from './types'

export interface Deps {
  now(): number
  /** Most recent `bars` 5-minute candles for a market from one source. May throw. */
  candles(market: BotMarket, source: SourceId, bars: number): Promise<Candle[]>
  /** Longer history for the weekly re-tune. Optional; without it the re-tune is skipped. */
  history?(market: BotMarket, days: number): Promise<Candle[]>
}

export type Seed = Record<string, { expR: number; n: number }>

const DAY = 86_400_000

export const cfgFor = (market: BotMarket): SimCfg => ({ ...withCosts(BOT_COSTS[market], DEFAULT_CFG), riskPct: BOT.riskPct, tfMs: BOT.tfMs })

export function makeTrack(market: BotMarket, strategy: StrategyId, now: number, seed: Seed = {}): Track {
  const id = `${market}:${strategy}`
  const def = STRATEGIES[strategy]
  const s = seed[id] ?? { expR: 0, n: 0 }
  const active = !def.trial && (s.n === 0 || s.expR > 0)
  const evidence = s.n
    ? `one-year backtest: ${s.expR >= 0 ? '+' : ''}${s.expR.toFixed(2)}R per trade over ${s.n} trades after costs`
    : 'no backtest evidence yet'
  return {
    id,
    market,
    strategy,
    status: active ? 'active' : 'benched',
    trial: def.trial || undefined,
    statusSince: now,
    statusWhy: def.trial ? `on trial, shadow only; ${evidence}` : evidence,
    seed: s,
    params: { ...def.defaults },
    sim: emptyTrack(),
    recent: [],
    buckets: {},
    benchedBuckets: {},
    lossStreak: 0,
    cooldownUntil: 0,
    n: 0,
    wins: 0,
    sumR: 0,
    takenN: 0,
    takenPnl: 0,
    lastRetuneAt: now,
  }
}

/** Add tracks for strategies introduced after this state was created. Returns the ids added. */
export function ensureTracks(state: BotState, now: number, seed: Seed = {}): string[] {
  const added: string[] = []
  for (const market of BOT_MARKETS) {
    for (const strategy of STRATEGY_IDS) {
      const id = `${market}:${strategy}`
      if (state.tracks[id]) continue
      state.tracks[id] = makeTrack(market, strategy, now, seed)
      added.push(id)
    }
  }
  return added
}

export function initState(now: number, seed: Seed = {}): BotState {
  const tracks: Record<string, Track> = {}
  for (const market of BOT_MARKETS) for (const strategy of STRATEGY_IDS) tracks[`${market}:${strategy}`] = makeTrack(market, strategy, now, seed)
  const feed = () => ({ source: null, lastBarT: 0, lastClose: 0, lastOkAt: 0, failures: 0 })
  return {
    v: 1,
    createdAt: now,
    startEquity: BOT.startEquity,
    equity: BOT.startEquity,
    paused: false,
    day: { key: Math.floor(now / DAY), startEquity: BOT.startEquity, halted: false },
    tracks,
    markets: { BTC: feed(), GOLD: feed() },
    lastTickAt: 0,
    lastTickMs: 0,
    ticks: 0,
    incidents: [],
    lessons: [],
    curve: [{ t: now, v: BOT.startEquity }],
  }
}

/** True if a stored value looks like a usable bot state. */
export function isValidState(s: any): s is BotState {
  return (
    !!s &&
    s.v === 1 &&
    Number.isFinite(s.equity) &&
    s.equity > 0 &&
    typeof s.tracks === 'object' &&
    BOT_MARKETS.every((m) => s.markets?.[m] && s.tracks[`${m}:liquidity`]?.sim) &&
    Object.values(s.tracks).every((t: any) => t?.sim && STRATEGIES[t.strategy as StrategyId])
  )
}

function incident(state: BotState, now: number, level: Incident['level'], msg: string, healed: boolean) {
  // Collapse repeats of an ongoing problem instead of filling the log with it.
  const again = state.incidents.slice(-8).find((x) => x.msg === msg && now - x.t < 3_600_000)
  if (again) again.t = now
  else state.incidents.push({ t: now, level, msg, healed })
  if (state.incidents.length > 60) state.incidents.splice(0, state.incidents.length - 60)
}

function lessons(state: BotState, items: Lesson[]) {
  state.lessons.push(...items)
  if (state.lessons.length > 60) state.lessons.splice(0, state.lessons.length - 60)
}

async function loadMarket(state: BotState, market: BotMarket, deps: Deps): Promise<{ candles: Candle[]; source: SourceId } | null> {
  const now = deps.now()
  const newest = Math.floor(now / BOT.tfMs) * BOT.tfMs - BOT.tfMs
  const errors: string[] = []
  for (const source of SOURCES) {
    try {
      const s = sanitize(await deps.candles(market, source, BOT.window), BOT.tfMs, now)
      const c = s.candles
      if (c.length < BOT.minBars) throw new Error(`only ${c.length} bars`)
      if (c[c.length - 1].t < newest - BOT.tfMs) throw new Error(`stale by ${Math.round((newest - c[c.length - 1].t) / 60_000)} min`)
      if (s.filled) incident(state, now, 'info', `${market}: filled ${s.filled} missing bar${s.filled > 1 ? 's' : ''} from ${source}.`, true)
      if (errors.length) incident(state, now, 'warn', `${market}: ${errors.join('; ')}. Using ${source} instead.`, true)
      return { candles: c, source }
    } catch (e) {
      errors.push(`${source} ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  incident(state, now, 'error', `${market}: no usable price data (${errors.join('; ')}). Holding open positions, opening nothing new.`, false)
  return null
}

/** Move open levels onto a new price source by the ratio between the two at the last shared bar. */
function rebase(state: BotState, market: BotMarket, c: Candle[], from: SourceId, to: SourceId, now: number) {
  const feed = state.markets[market]
  const shared = c.find((b) => b.t === feed.lastBarT)
  const ratio = shared && feed.lastClose > 0 ? shared.c / feed.lastClose : NaN
  const usable = Number.isFinite(ratio) && ratio > 0.98 && ratio < 1.02
  let touched = 0
  for (const t of Object.values(state.tracks)) {
    if (t.market !== market) continue
    if (t.sim.pending) {
      if (usable) for (const k of ['entry', 'stop', 'target'] as const) t.sim.pending[k] *= ratio
      else t.sim.pending = null
      touched++
    }
    if (t.sim.position && usable) {
      for (const k of ['entry', 'stop', 'target', 'riskPerUnit'] as const) t.sim.position[k] *= ratio
      t.sim.position.qty /= ratio
      touched++
    }
  }
  const detail = !touched
    ? ''
    : usable
      ? ` Open levels moved ${((ratio - 1) * 100).toFixed(3)}% to match.`
      : ' Prices could not be matched, so resting orders were cancelled.'
  incident(state, now, 'warn', `${market}: price source changed from ${from} to ${to}.${detail}`, true)
}

function openTaken(state: BotState, market?: BotMarket, except?: string): number {
  let n = 0
  for (const t of Object.values(state.tracks)) {
    if (t.id === except || (market && t.market !== market)) continue
    if (t.sim.position?.taken || t.sim.pending?.taken) n++
  }
  return n
}

/**
 * One bot cycle: load candles, replay every bar closed since the last cycle
 * through each strategy track, book results, and apply what was learned.
 * Safe to call at any time and any number of times.
 */
export async function runTick(state: BotState, journal: JournalEntry[], deps: Deps): Promise<{ bars: number; trades: number }> {
  const started = deps.now()
  const dayKey = Math.floor(started / DAY)
  if (state.day.key !== dayKey) state.day = { key: dayKey, startEquity: state.equity, halted: false }
  let bars = 0
  let trades = 0

  const loaded = await Promise.all(BOT_MARKETS.map((m) => loadMarket(state, m, deps)))
  BOT_MARKETS.forEach((market, mi) => {
    const feed = state.markets[market]
    const data = loaded[mi]
    if (!data) {
      feed.failures++
      return
    }
    const { candles: c, source } = data
    if (feed.failures > 0 && feed.lastOkAt > 0) {
      incident(state, started, 'info', `${market}: price data is back after ${feed.failures} failed cycle${feed.failures > 1 ? 's' : ''}.`, true)
    }
    if (feed.source && feed.source !== source) rebase(state, market, c, feed.source, source, started)

    let from = c.length
    if (feed.lastBarT > 0) {
      from = c.findIndex((b) => b.t > feed.lastBarT)
      if (from < 0) from = c.length
      if (c[0].t > feed.lastBarT) {
        incident(state, started, 'warn', `${market}: offline longer than the loaded history. Resuming from the oldest bar available.`, true)
      } else if (c.length - from > 1) {
        incident(state, started, 'info', `${market}: caught up ${c.length - from} bars missed while offline.`, true)
      }
      from = Math.max(from, Math.min(1500, c.length - 1))
    }
    bars += c.length - from

    const cfg = cfgFor(market)
    const ctx = contextFn(c)
    const tracks = Object.values(state.tracks).filter((t) => t.market === market)
    // Keys added to a strategy after a track was created take the strategy's current default.
    for (const t of tracks) t.params = { ...STRATEGIES[t.strategy].defaults, ...t.params }
    const signals = tracks.map((t) => STRATEGIES[t.strategy].prepare(c, t.params, BOT.tfMs))
    for (let i = from; i < c.length; i++) {
      tracks.forEach((track, k) => {
        const hooks: StepHooks = {
          equity: () => state.equity,
          ctx,
          gate: (intent, cx) => {
            if (state.paused) return { take: false, note: 'bot paused' }
            if (track.status === 'benched') return { take: false, note: 'strategy benched' }
            if (state.day.halted) return { take: false, note: 'daily loss limit reached' }
            if (c[i].t < track.cooldownUntil) return { take: false, note: 'cooling off after losses' }
            const keys = [`side:${intent.side}`, ...(cx ? [`session:${cx.session}`, `vol:${cx.vol}`] : [])]
            const off = keys.find((key) => track.benchedBuckets[key])
            if (off) return { take: false, note: `context benched (${off})` }
            if (openTaken(state, market, track.id) > 0) return { take: false, note: 'market already has a position' }
            if (openTaken(state, undefined, track.id) >= BOT.maxOpen) return { take: false, note: 'position limit reached' }
            return { take: true }
          },
        }
        const r = stepBar(track.sim, c, i, signals[k], cfg, hooks)
        if (!r.closed) return
        const t = r.closed
        trades++
        if (t.taken) {
          state.equity += t.pnl
          state.curve.push({ t: t.exitT, v: state.equity })
        }
        journal.push({ ...t, id: `${track.id}:${t.entryT}`, track: track.id, market, strategy: track.strategy, equityAfter: state.equity })
        lessons(state, learn(track, t, started))
        if (!state.day.halted && state.equity <= state.day.startEquity * (1 - BOT.dailyLossPct)) {
          state.day.halted = true
          lessons(state, [{ t: started, kind: 'guard', msg: `Daily loss limit hit (${(BOT.dailyLossPct * 100).toFixed(0)}%). No new paper trades until tomorrow (UTC); signals continue in shadow.` }])
        }
      })
    }
    const last = c[c.length - 1]
    state.markets[market] = { source, lastBarT: last.t, lastClose: last.c, lastOkAt: started, failures: 0 }
  })

  const lastPt = state.curve[state.curve.length - 1]
  if (!lastPt || started - lastPt.t >= 3_600_000) state.curve.push({ t: started, v: state.equity })
  if (state.curve.length > 3000) state.curve.splice(0, state.curve.length - 3000)
  if (journal.length > 1500) journal.splice(0, journal.length - 1500)
  state.lastTickAt = started
  state.lastTickMs = deps.now() - started
  state.ticks++
  return { bars, trades }
}

/**
 * Weekly re-tune of one track, the one that has waited longest. Kept separate
 * from the trading cycle so slow history downloads can never delay a trade.
 */
export async function maybeRetune(state: BotState, deps: Deps): Promise<boolean> {
  if (!deps.history) return false
  const now = deps.now()
  const due = Object.values(state.tracks)
    .filter((t) => now - t.lastRetuneAt >= BOT.retuneEveryMs)
    .sort((a, b) => a.lastRetuneAt - b.lastRetuneAt)[0]
  if (!due) return false
  due.lastRetuneAt = now
  try {
    const hist = sanitize(await deps.history(due.market, BOT.retuneDays), BOT.tfMs, now).candles
    const res = tune(hist, due.strategy, due.params, cfgFor(due.market))
    if (res.adopt) due.params = res.params
    lessons(state, [{ t: now, track: due.id, kind: 'retune', msg: `Weekly re-tune, ${STRATEGIES[due.strategy].name} on ${due.market}: ${res.msg}.` }])
  } catch (e) {
    incident(state, now, 'warn', `Re-tune of ${due.id} skipped: ${e instanceof Error ? e.message : String(e)}. Will retry next week.`, true)
  }
  return true
}

export { incident as logIncident }
