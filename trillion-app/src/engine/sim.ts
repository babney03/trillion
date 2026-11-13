import type { Candle, OrderIntent, Side, SignalFn, SimCfg, Trade, TradeCtx } from './types'

export interface Pending {
  side: Side
  type: 'limit' | 'market'
  entry: number
  stop: number
  target: number
  placedT: number
  expiresT: number
  setup: string
  taken: boolean
  note?: string
  ctx?: TradeCtx
}

export interface Position {
  side: Side
  entry: number
  stop: number
  target: number
  qty: number
  riskPerUnit: number
  /** Fee rate paid on entry (maker for limit fills, taker for market fills). */
  feeIn: number
  entryT: number
  maxHoldT: number
  setup: string
  taken: boolean
  note?: string
  ctx?: TradeCtx
}

/** Everything a strategy track carries between bars. Plain JSON so the bot can persist it. */
export interface TrackState {
  pending: Pending | null
  position: Position | null
}

export interface StepHooks {
  equity(): number
  /** Decide whether a new signal risks real (paper) equity or only runs in shadow. */
  gate?(intent: OrderIntent, ctx: TradeCtx | undefined): { take: boolean; note?: string }
  ctx?(i: number): TradeCtx
}

export interface StepResult {
  closed?: Trade
  filled?: Position
  placed?: Pending
  cancelled?: Pending
  /** A signal was ignored because costs would eat too much of the risk. */
  skipped?: 'cost'
}

export const emptyTrack = (): TrackState => ({ pending: null, position: null })

function close(pos: Position, exit: number, exitT: number, reason: Trade['reason'], cfg: SimCfg): Trade {
  const dir = pos.side === 'long' ? 1 : -1
  const feeOut = (reason === 'target' ? cfg.makerBps : cfg.takerBps) / 1e4
  const costPerUnit = pos.entry * pos.feeIn + exit * feeOut
  const fees = costPerUnit * pos.qty
  return {
    side: pos.side,
    setup: pos.setup,
    entryT: pos.entryT,
    exitT,
    entry: pos.entry,
    exit,
    stop: pos.stop,
    target: pos.target,
    qty: pos.qty,
    pnl: pos.qty ? (exit - pos.entry) * dir * pos.qty - fees : 0,
    fees,
    r: ((exit - pos.entry) * dir - costPerUnit) / pos.riskPerUnit,
    reason,
    bars: Math.max(1, Math.round((exitT - pos.entryT) / cfg.tfMs) + 1),
    taken: pos.taken,
    ctx: pos.ctx,
    note: pos.note,
  }
}

/** Exit check for one bar. `entryBar` applies the conservative rule for limit fills made mid-bar. */
function checkExit(pos: Position, b: Candle, cfg: SimCfg, entryBar: boolean): Trade | null {
  const slip = cfg.slipBps / 1e4
  if (pos.side === 'long') {
    if (!entryBar && b.o <= pos.stop) return close(pos, b.o * (1 - slip), b.t, 'stop', cfg)
    if (b.l <= pos.stop) return close(pos, pos.stop * (1 - slip), b.t, 'stop', cfg)
    if (entryBar) return b.c >= pos.target ? close(pos, pos.target, b.t, 'target', cfg) : null
    if (b.o >= pos.target) return close(pos, b.o, b.t, 'target', cfg)
    if (b.h >= pos.target) return close(pos, pos.target, b.t, 'target', cfg)
    if (b.t >= pos.maxHoldT) return close(pos, b.c * (1 - slip), b.t, 'time', cfg)
  } else {
    if (!entryBar && b.o >= pos.stop) return close(pos, b.o * (1 + slip), b.t, 'stop', cfg)
    if (b.h >= pos.stop) return close(pos, pos.stop * (1 + slip), b.t, 'stop', cfg)
    if (entryBar) return b.c <= pos.target ? close(pos, pos.target, b.t, 'target', cfg) : null
    if (b.o <= pos.target) return close(pos, b.o, b.t, 'target', cfg)
    if (b.l <= pos.target) return close(pos, pos.target, b.t, 'target', cfg)
    if (b.t >= pos.maxHoldT) return close(pos, b.c * (1 + slip), b.t, 'time', cfg)
  }
  return null
}

function open(o: Pending, fill: number, b: Candle, cfg: SimCfg, equity: number): Position | null {
  const riskPerUnit = Math.abs(fill - o.stop)
  const dir = o.side === 'long' ? 1 : -1
  if (!(riskPerUnit > 0) || (fill - o.stop) * dir <= 0) return null
  const qty = o.taken ? Math.min((equity * cfg.riskPct) / riskPerUnit, (equity * cfg.maxLeverage) / fill) : 0
  return {
    side: o.side,
    entry: fill,
    stop: o.stop,
    target: o.target,
    qty,
    riskPerUnit,
    feeIn: (o.type === 'limit' ? cfg.makerBps : cfg.takerBps) / 1e4,
    entryT: b.t,
    maxHoldT: b.t + cfg.maxHoldBars * cfg.tfMs,
    setup: o.setup,
    taken: o.taken,
    note: o.note,
    ctx: o.ctx,
  }
}

/**
 * Advance one strategy track by one closed bar. Used unchanged by the
 * backtester (in a loop) and by the live bot (once per new bar).
 */
export function stepBar(st: TrackState, c: Candle[], i: number, signal: SignalFn, cfg: SimCfg, hooks: StepHooks): StepResult {
  const b = c[i]
  const res: StepResult = {}
  const slip = cfg.slipBps / 1e4

  if (st.position) {
    const t = checkExit(st.position, b, cfg, false)
    if (t) {
      res.closed = t
      st.position = null
    }
  } else if (st.pending) {
    const o = st.pending
    const dir = o.side === 'long' ? 1 : -1
    let fill: number | null = null
    let midBar = false
    if (b.t >= o.expiresT) {
      res.cancelled = o
      st.pending = null
    } else if (o.type === 'market') {
      fill = b.o * (1 + dir * slip)
    } else if (dir === 1 ? b.l <= o.entry : b.h >= o.entry) {
      fill = dir === 1 ? Math.min(o.entry, b.o) : Math.max(o.entry, b.o)
      midBar = true
    } else if (dir === 1 ? b.h >= o.target : b.l <= o.target) {
      // The move ran to target without filling us: the setup is spent.
      res.cancelled = o
      st.pending = null
    }
    if (fill !== null) {
      st.pending = null
      const pos = open(o, fill, b, cfg, hooks.equity())
      if (!pos) res.cancelled = o
      else {
        res.filled = pos
        const t = checkExit(pos, b, cfg, midBar)
        if (t) res.closed = t
        else st.position = pos
      }
    }
  }

  if (!st.position && !st.pending) {
    const intent = signal(i)
    if (intent) {
      const dir = intent.side === 'long' ? 1 : -1
      const valid = (intent.entry - intent.stop) * dir > 0 && (intent.target - intent.entry) * dir > 0
      // Worst case: stopped out. If fees and slippage alone would cost too much of 1R, the trade is not worth taking.
      const feeIn = intent.type === 'limit' ? cfg.makerBps : cfg.takerBps + cfg.slipBps
      const costR = (intent.entry * (feeIn + cfg.takerBps + cfg.slipBps)) / 1e4 / Math.abs(intent.entry - intent.stop)
      if (valid && costR > cfg.maxCostR) res.skipped = 'cost'
      else if (valid) {
        const ctx = hooks.ctx?.(i)
        const g = hooks.gate?.(intent, ctx) ?? { take: true }
        st.pending = {
          side: intent.side,
          type: intent.type,
          entry: intent.entry,
          stop: intent.stop,
          target: intent.target,
          placedT: b.t,
          expiresT: b.t + (intent.expiryBars + 1) * cfg.tfMs,
          setup: intent.setup,
          taken: g.take,
          note: g.note,
          ctx,
        }
        res.placed = st.pending
      }
    }
  }
  return res
}

export interface SimResult {
  trades: Trade[]
  /** Closed-trade equity, one point per trade exit plus the start and end. */
  equity: { t: number; v: number }[]
  startEquity: number
  endEquity: number
  from: number
  to: number
}

/** Run a strategy over bars [from, to). Signals must already be causal. */
export function simulate(
  c: Candle[],
  signal: SignalFn,
  cfg: SimCfg,
  opts: { from?: number; to?: number; startEquity?: number; ctx?: (i: number) => TradeCtx } = {},
): SimResult {
  const from = Math.max(0, opts.from ?? 0)
  const to = Math.min(c.length, opts.to ?? c.length)
  const startEquity = opts.startEquity ?? 10_000
  let equity = startEquity
  const st = emptyTrack()
  const trades: Trade[] = []
  const curve = [{ t: c[from]?.t ?? 0, v: equity }]
  const hooks: StepHooks = { equity: () => equity, ctx: opts.ctx }
  for (let i = from; i < to; i++) {
    const r = stepBar(st, c, i, signal, cfg, hooks)
    if (r.closed) {
      equity += r.closed.pnl
      trades.push(r.closed)
      curve.push({ t: r.closed.exitT, v: equity })
    }
  }
  if (st.position && to > from) {
    const last = c[to - 1]
    const t = close(st.position, last.c, last.t, 'end', cfg)
    equity += t.pnl
    trades.push(t)
  }
  if (to > from) curve.push({ t: c[to - 1].t, v: equity })
  return { trades, equity: curve, startEquity, endEquity: equity, from, to }
}
