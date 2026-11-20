import { MARKETS } from '../data/candles'
import { STRATEGIES, type StrategyId } from '../engine/strategies'
import type { Side } from '../engine/types'
import type { BotMarket } from './types'

/** Only bars this recent can raise an alert, so catching up after an outage never floods the phone. */
export const ALERT_FRESH_MS = 20 * 60_000

export interface AlertEvent {
  kind: 'setup' | 'closed'
  t: number
  track: string
  market: BotMarket
  strategy: StrategyId
  side: Side
  /** Paper money (true) or shadow (false). */
  taken: boolean
  type?: 'limit' | 'market'
  entry: number
  stop: number
  target: number
  exit?: number
  r?: number
  pnl?: number
  reason?: string
}

export interface AlertPrefs {
  /** Setups from the owner's strategy (paper money). */
  mine: boolean
  /** Setups from the shadow trials. */
  trials: boolean
  /** Paper trades closing, with the result. */
  closed: boolean
}

export const DEFAULT_PREFS: AlertPrefs = { mine: true, trials: true, closed: true }

/** Benched non-trial strategies (ICT, scalper) only run in the background and never alert. */
export function wanted(e: AlertEvent, prefs: AlertPrefs): boolean {
  const def = STRATEGIES[e.strategy]
  if (e.kind === 'closed') return prefs.closed && e.taken
  if (e.strategy === 'liquidity') return prefs.mine
  if (def?.trial) return prefs.trials
  return false
}

const px = (m: BotMarket, x: number) => x.toLocaleString('en-US', { minimumFractionDigits: MARKETS[m].decimals, maximumFractionDigits: MARKETS[m].decimals })

export function formatAlert(e: AlertEvent): { title: string; body: string; tag: string } {
  const name = MARKETS[e.market].name
  const strat = STRATEGIES[e.strategy]?.name ?? e.strategy
  const dir = e.side === 'long' ? 'Long' : 'Short'
  if (e.kind === 'closed') {
    const r = e.r ?? 0
    const won = r > 0
    return {
      title: `${won ? 'Win' : 'Loss'}: ${name} ${dir.toLowerCase()} ${r >= 0 ? '+' : ''}${r.toFixed(2)}R`,
      body: `${strat}. Exit ${px(e.market, e.exit ?? 0)} (${e.reason === 'time' ? 'time stop' : e.reason}). Paper P&L ${(e.pnl ?? 0) >= 0 ? '+' : '−'}$${Math.abs(e.pnl ?? 0).toFixed(2)}.`,
      tag: `${e.track}:closed:${e.t}`,
    }
  }
  const risk = Math.abs(e.entry - e.stop)
  const rr = risk > 0 ? Math.abs(e.target - e.entry) / risk : 0
  const how = e.type === 'limit' ? `limit at ${px(e.market, e.entry)}` : `at market, about ${px(e.market, e.entry)}`
  return {
    title: `${e.taken ? 'Setup' : 'Shadow setup'}: ${dir} ${name}`,
    body: `${strat}. Entry ${how}, stop ${px(e.market, e.stop)}, target ${px(e.market, e.target)} (${rr.toFixed(1)}R).${e.taken ? '' : ' Trial only, no paper money.'}`,
    tag: `${e.track}:setup:${e.t}`,
  }
}
