import type { Pool } from './data'

export interface TrendRead {
  /** 0-100. A heuristic for "worth a look", built from activity; it is not a prediction. */
  score: number
  flags: string[]
  ageH: number | null
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))

/** Score a pool on breadth of buyers, buy pressure, turnover, momentum and freshness; list the risks plainly. */
export function readTrend(p: Pool, now = Date.now()): TrendRead {
  const h1 = p.tx.h1
  const buyers = h1?.buyers ?? 0
  const sellers = h1?.sellers ?? 0
  const liq = p.liquidity ?? 0
  const ageH = p.createdAt ? (now - p.createdAt) / 3_600_000 : null
  const breadth = clamp(Math.log10(1 + buyers) / Math.log10(501)) * 30
  const pressure = buyers + sellers > 0 ? clamp((buyers / (buyers + sellers) - 0.5) * 4) * 20 : 0
  const turnover = liq > 0 ? clamp((p.vol.h1 ?? 0) / liq) * 20 : 0
  const m = p.chg.h1 ?? 0
  const momentum = m <= 0 ? 0 : m <= 40 ? (m / 40) * 15 : clamp(1 - (m - 40) / 160) * 15
  const fresh = ageH === null ? 0 : ageH < 24 * 7 ? 15 : ageH < 24 * 30 ? 8 : 0
  const flags: string[] = []
  if (liq < 50_000) flags.push('thin liquidity')
  if (ageH !== null && ageH < 6) flags.push('hours old')
  if (m > 100) flags.push('parabolic')
  if (sellers > buyers * 1.5 && sellers > 20) flags.push('more sellers than buyers')
  if ((p.chg.h24 ?? 0) < -40) flags.push('down hard today')
  return { score: Math.round(breadth + pressure + turnover + momentum + fresh), flags, ageH }
}

export const ageLabel = (h: number | null) => (h === null ? '—' : h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`)
