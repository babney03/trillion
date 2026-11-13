import type { Candle, SimCfg, Trade } from './types'

export interface Metrics {
  trades: number
  winRate: number
  netPct: number
  maxDDPct: number
  profitFactor: number
  expectancyR: number
  totalR: number
  avgWinR: number
  avgLossR: number
  sharpe: number
  avgBars: number
  fees: number
  longs: number
  shorts: number
}

const DAY = 86_400_000

/** Summarise closed trades over a period. Drawdown and Sharpe use closed-trade equity. */
export function summarize(trades: Trade[], startEquity: number, startT: number, endT: number): Metrics {
  const n = trades.length
  let eq = startEquity
  let peak = startEquity
  let maxDD = 0
  let grossWin = 0
  let grossLoss = 0
  let wins = 0
  let sumR = 0
  let winR = 0
  let lossR = 0
  let bars = 0
  let fees = 0
  let longs = 0
  const daily = new Map<number, number>()
  for (const t of trades) {
    eq += t.pnl
    if (eq > peak) peak = eq
    const dd = peak > 0 ? (peak - eq) / peak : 0
    if (dd > maxDD) maxDD = dd
    if (t.r > 0) {
      wins++
      winR += t.r
      grossWin += t.pnl
    } else {
      lossR += t.r
      grossLoss -= t.pnl
    }
    sumR += t.r
    bars += t.bars
    fees += t.fees
    if (t.side === 'long') longs++
    const d = Math.floor(t.exitT / DAY)
    daily.set(d, (daily.get(d) ?? 0) + t.pnl)
  }
  // Daily returns across every calendar day in the period, flat days included.
  let sharpe = 0
  const d0 = Math.floor(startT / DAY)
  const d1 = Math.floor(endT / DAY)
  if (d1 > d0) {
    const rets: number[] = []
    let e = startEquity
    for (let d = d0; d <= d1; d++) {
      const p = daily.get(d) ?? 0
      rets.push(e > 0 ? p / e : 0)
      e += p
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1))
    sharpe = sd > 0 ? (mean / sd) * Math.sqrt(365) : 0
  }
  return {
    trades: n,
    winRate: n ? wins / n : 0,
    netPct: (eq / startEquity - 1) * 100,
    maxDDPct: maxDD * 100,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    expectancyR: n ? sumR / n : 0,
    totalR: sumR,
    avgWinR: wins ? winR / wins : 0,
    avgLossR: n - wins ? lossR / (n - wins) : 0,
    sharpe,
    avgBars: n ? bars / n : 0,
    fees,
    longs,
    shorts: n - longs,
  }
}

export interface BuyHold {
  netPct: number
  maxDDPct: number
  curve: { t: number; v: number }[]
}

/** Baseline: buy the first bar, hold to the last, pay the fee both ways. */
export function buyHold(c: Candle[], from: number, to: number, startEquity: number, cfg: SimCfg): BuyHold {
  const fee = cfg.takerBps / 1e4
  const p0 = c[from].o
  const qty = startEquity / (p0 * (1 + fee))
  const step = Math.max(1, Math.floor((to - from) / 600))
  const curve: { t: number; v: number }[] = []
  let peak = startEquity
  let maxDD = 0
  for (let i = from; i < to; i++) {
    const v = qty * c[i].c
    if (v > peak) peak = v
    const dd = (peak - v) / peak
    if (dd > maxDD) maxDD = dd
    if ((i - from) % step === 0 || i === to - 1) curve.push({ t: c[i].t, v })
  }
  const end = qty * c[to - 1].c * (1 - fee)
  curve[curve.length - 1].v = end
  return { netPct: (end / startEquity - 1) * 100, maxDDPct: maxDD * 100, curve }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface MonteCarlo {
  runs: number
  netPct: { p5: number; p50: number; p95: number }
  maxDDPct: { p5: number; p50: number; p95: number }
  probLoss: number
}

/**
 * Bootstrap the trade results (sampling with replacement) to show how much of
 * the outcome is the order and luck of the draw.
 */
export function monteCarlo(rs: number[], riskPct: number, runs = 1000, seed = 7): MonteCarlo | null {
  if (rs.length < 5) return null
  const rnd = mulberry32(seed)
  const nets: number[] = []
  const dds: number[] = []
  let losses = 0
  for (let k = 0; k < runs; k++) {
    let eq = 1
    let peak = 1
    let dd = 0
    for (let j = 0; j < rs.length; j++) {
      eq *= 1 + rs[Math.floor(rnd() * rs.length)] * riskPct
      if (eq > peak) peak = eq
      else if ((peak - eq) / peak > dd) dd = (peak - eq) / peak
    }
    nets.push((eq - 1) * 100)
    dds.push(dd * 100)
    if (eq < 1) losses++
  }
  nets.sort((a, b) => a - b)
  dds.sort((a, b) => a - b)
  const q = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))]
  return {
    runs,
    netPct: { p5: q(nets, 0.05), p50: q(nets, 0.5), p95: q(nets, 0.95) },
    maxDDPct: { p5: q(dds, 0.05), p50: q(dds, 0.5), p95: q(dds, 0.95) },
    probLoss: losses / runs,
  }
}
