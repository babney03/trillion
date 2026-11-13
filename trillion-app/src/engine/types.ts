/** One OHLCV bar. `t` is the bar's open time in ms since epoch (UTC). */
export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type Side = 'long' | 'short'

/** What a strategy asks for at the close of a bar. */
export interface OrderIntent {
  side: Side
  type: 'limit' | 'market'
  /** Limit price; for market orders the signal bar's close (reference only). */
  entry: number
  stop: number
  target: number
  /** Bars a limit order stays valid after the signal bar. */
  expiryBars: number
  setup: string
}

/** Causal signal function: may only use bars 0..i. */
export type SignalFn = (i: number) => OrderIntent | null

export interface TradeCtx {
  session: 'asia' | 'london' | 'newyork' | 'late'
  vol: 'low' | 'normal' | 'high'
}

export interface Trade {
  side: Side
  setup: string
  entryT: number
  exitT: number
  entry: number
  exit: number
  stop: number
  target: number
  qty: number
  pnl: number
  fees: number
  /** Result in units of initial risk, after costs. */
  r: number
  reason: 'target' | 'stop' | 'time' | 'end'
  bars: number
  /** False for shadow trades (tracked, no equity at risk). */
  taken: boolean
  ctx?: TradeCtx
  note?: string
}

export interface SimCfg {
  /** Fee on resting (limit) fills: limit entries and target exits. Basis points. */
  makerBps: number
  /** Fee on market fills: market entries, stops and time exits. Basis points. */
  takerBps: number
  /** Slippage on market and stop fills, basis points. */
  slipBps: number
  /** Fraction of equity risked per trade, e.g. 0.005. */
  riskPct: number
  maxLeverage: number
  maxHoldBars: number
  /** Skip a trade when its worst-case round-trip cost exceeds this share of the risk. */
  maxCostR: number
  tfMs: number
}

export interface CostPreset {
  label: string
  makerBps: number
  takerBps: number
  slipBps: number
}

export const COST_PRESETS = {
  perp: { label: 'Crypto perp: maker 1.5, taker 4.5 bps', makerBps: 1.5, takerBps: 4.5, slipBps: 1 },
  futures: { label: 'Futures / CFD: 0.5 bps per side', makerBps: 0.5, takerBps: 0.5, slipBps: 0.5 },
  zero: { label: 'No costs (theory only)', makerBps: 0, takerBps: 0, slipBps: 0 },
} satisfies Record<string, CostPreset>

export type CostPresetId = keyof typeof COST_PRESETS

export const DEFAULT_CFG: SimCfg = {
  ...COST_PRESETS.perp,
  riskPct: 0.005,
  maxLeverage: 5,
  maxHoldBars: 96,
  maxCostR: 0.25,
  tfMs: 300_000,
}

export const withCosts = (preset: CostPresetId, base: SimCfg = DEFAULT_CFG): SimCfg => {
  const { makerBps, takerBps, slipBps } = COST_PRESETS[preset]
  return { ...base, makerBps, takerBps, slipBps }
}

export type Params = Record<string, number>
