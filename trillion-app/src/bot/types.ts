import type { Params, Trade } from '../engine/types'
import type { TrackState } from '../engine/sim'
import type { StrategyId } from '../engine/strategies'
import type { CostPresetId } from '../engine/types'

export type BotMarket = 'BTC' | 'GOLD' | 'OIL'
export const BOT_MARKETS: BotMarket[] = ['BTC', 'GOLD', 'OIL']
export type SourceId = 'hyperliquid' | 'binance' | 'mexc'
/** Preferred source first. */
export const SOURCES: Record<BotMarket, SourceId[]> = { BTC: ['hyperliquid', 'binance'], GOLD: ['hyperliquid', 'binance'], OIL: ['hyperliquid', 'mexc'] }

/** Cost model each market is paper-traded under. */
export const BOT_COSTS: Record<BotMarket, CostPresetId> = { BTC: 'perp', GOLD: 'futures', OIL: 'perp' }

export const BOT = {
  tfMs: 300_000,
  startEquity: 10_000,
  riskPct: 0.01,
  /** Bars loaded each tick. Must comfortably exceed the longest strategy warm-up. */
  window: 3000,
  minBars: 1800,
  dailyLossPct: 0.02,
  lossStreak: 3,
  cooldownMs: 2 * 3_600_000,
  maxOpen: 3,
  recentN: 40,
  bucketN: 30,
  trackMinN: 15,
  bucketMinN: 12,
  retuneEveryMs: 7 * 86_400_000,
  retuneDays: 60,
} as const

export interface Incident {
  t: number
  level: 'info' | 'warn' | 'error'
  msg: string
  /** True when the bot dealt with it on its own. */
  healed: boolean
}

export interface Lesson {
  t: number
  track?: string
  kind: 'bench' | 'restore' | 'context-off' | 'context-on' | 'retune' | 'guard'
  msg: string
}

export interface Track {
  id: string
  market: BotMarket
  strategy: StrategyId
  status: 'active' | 'benched'
  /** Trial track: shadow only, never restored to paper money automatically. */
  trial?: boolean
  statusSince: number
  statusWhy: string
  /** One-year backtest at this market's costs: the evidence the track started with. */
  seed: { expR: number; n: number }
  params: Params
  sim: TrackState
  /** Last results in R, live and shadow alike, newest last. */
  recent: number[]
  /** Results by context, e.g. "session:asia", "vol:high", "side:long". */
  buckets: Record<string, number[]>
  benchedBuckets: Record<string, { since: number; why: string }>
  lossStreak: number
  cooldownUntil: number
  n: number
  wins: number
  sumR: number
  takenN: number
  takenPnl: number
  lastRetuneAt: number
}

export interface MarketFeed {
  source: SourceId | null
  lastBarT: number
  lastClose: number
  lastOkAt: number
  failures: number
}

export interface BotState {
  v: 1
  createdAt: number
  startEquity: number
  equity: number
  paused: boolean
  day: { key: number; startEquity: number; halted: boolean }
  tracks: Record<string, Track>
  markets: Record<BotMarket, MarketFeed>
  lastTickAt: number
  lastTickMs: number
  ticks: number
  incidents: Incident[]
  lessons: Lesson[]
  curve: { t: number; v: number }[]
}

export interface JournalEntry extends Trade {
  id: string
  track: string
  market: BotMarket
  strategy: StrategyId
  equityAfter: number
}
