/** The trading journal: trades you take yourself, and a note for each day. Pure functions only. */

export const SETUP_TAGS = ['Daily bias', 'Sweep', 'Inducement', 'CSD', 'BOS', 'FVG', 'Equal highs/lows', 'News'] as const
export const MARKET_PRESETS = ['XAUUSD', 'USOIL', 'BTCUSD', 'NAS100', 'US30', 'SPX500', 'EURUSD', 'GBPUSD'] as const

export interface JTrade {
  id: string
  /** Local calendar date of the entry, YYYY-MM-DD. */
  date: string
  /** Local time of the entry, HH:MM, optional. */
  time?: string
  market: string
  side: 'long' | 'short'
  entry?: number
  stop?: number
  target?: number
  exit?: number
  size?: number
  /** Profit or loss in account currency, as the broker reported it. */
  pnl?: number
  tags: string[]
  levelSwept?: string
  drawTo?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface JDay {
  notes: string
  updatedAt: number
}

export interface JournalData {
  trades: JTrade[]
  days: Record<string, JDay>
}

const num = (x: unknown): number | undefined => {
  const n = typeof x === 'string' ? Number(x.replace(/[$,\s]/g, '')) : typeof x === 'number' ? x : NaN
  return Number.isFinite(n) ? n : undefined
}
const text = (x: unknown, max: number): string | undefined => {
  if (typeof x !== 'string') return undefined
  const t = x.trim().slice(0, max)
  return t || undefined
}
export const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

/** Validate and clean a trade coming from a form or the network. Returns null if unusable. */
export function cleanTrade(x: any, now: number): JTrade | null {
  if (!x || !isDate(x.date)) return null
  const market = text(x.market, 24)?.toUpperCase()
  if (!market || (x.side !== 'long' && x.side !== 'short')) return null
  return {
    id: typeof x.id === 'string' && /^[\w-]{6,40}$/.test(x.id) ? x.id : `t${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    date: x.date,
    time: typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time) ? x.time : undefined,
    market,
    side: x.side,
    entry: num(x.entry),
    stop: num(x.stop),
    target: num(x.target),
    exit: num(x.exit),
    size: num(x.size),
    pnl: num(x.pnl),
    tags: Array.isArray(x.tags) ? [...new Set(x.tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.slice(0, 24)))].slice(0, 12) as string[] : [],
    levelSwept: text(x.levelSwept, 120),
    drawTo: text(x.drawTo, 120),
    notes: text(x.notes, 4000),
    createdAt: num(x.createdAt) ?? now,
    updatedAt: now,
  }
}

/** Result in units of the planned risk, when entry, stop and exit are all known. */
export function rMultiple(t: Pick<JTrade, 'side' | 'entry' | 'stop' | 'exit'>): number | undefined {
  if (t.entry === undefined || t.stop === undefined || t.exit === undefined) return undefined
  const risk = Math.abs(t.entry - t.stop)
  if (!(risk > 0)) return undefined
  return ((t.exit - t.entry) * (t.side === 'long' ? 1 : -1)) / risk
}

/** Planned reward-to-risk, when entry, stop and target are known. */
export function plannedRR(t: Pick<JTrade, 'entry' | 'stop' | 'target'>): number | undefined {
  if (t.entry === undefined || t.stop === undefined || t.target === undefined) return undefined
  const risk = Math.abs(t.entry - t.stop)
  return risk > 0 ? Math.abs(t.target - t.entry) / risk : undefined
}

export type Outcome = 'win' | 'loss' | 'even' | 'open'

export function outcome(t: JTrade): Outcome {
  const v = t.pnl ?? rMultiple(t)
  if (v === undefined) return 'open'
  if (Math.abs(v) < 1e-9) return 'even'
  return v > 0 ? 'win' : 'loss'
}

export interface Summary {
  trades: number
  closed: number
  wins: number
  losses: number
  winRate: number
  pnl: number
  avgWin: number
  avgLoss: number
  avgR: number | undefined
  rCount: number
  profitFactor: number | undefined
}

export function summarize(trades: JTrade[]): Summary {
  let wins = 0, losses = 0, pnl = 0, winSum = 0, lossSum = 0, rSum = 0, rCount = 0
  for (const t of trades) {
    const o = outcome(t)
    if (o === 'win') wins++
    if (o === 'loss') losses++
    if (t.pnl !== undefined) {
      pnl += t.pnl
      if (t.pnl > 0) winSum += t.pnl
      else lossSum += -t.pnl
    }
    const r = rMultiple(t)
    if (r !== undefined) {
      rSum += r
      rCount++
    }
  }
  const closed = trades.filter((t) => outcome(t) !== 'open').length
  return {
    trades: trades.length,
    closed,
    wins,
    losses,
    winRate: wins + losses ? wins / (wins + losses) : 0,
    pnl,
    avgWin: wins ? winSum / wins : 0,
    avgLoss: losses ? lossSum / losses : 0,
    avgR: rCount ? rSum / rCount : undefined,
    rCount,
    profitFactor: lossSum > 0 ? winSum / lossSum : winSum > 0 ? Infinity : undefined,
  }
}

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Six weeks of dates covering a month, starting on Sunday. `month` is 0-11. */
export function monthGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { key: dateKey(d), day: d.getDate(), inMonth: d.getMonth() === month }
  })
}

/** Group a list by a key, keeping order. */
export function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    const arr = m.get(k)
    if (arr) arr.push(it)
    else m.set(k, [it])
  }
  return m
}
