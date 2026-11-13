import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BotState, JournalEntry } from '../bot/types'
import { hlInfo, MARKET_IDS, MARKETS, type MarketId } from '../data/candles'
import { onStatus, subscribe, type LiveStatus } from '../data/live'

export interface Quote {
  px: number
  prev: number
  chg: number
  volume: number
  funding: number
  t: number
}

export interface Poll<T> {
  data: T | null
  error: string | null
  at: number
  refresh: () => void
}

/** Fetch on an interval, pause while the tab is hidden, keep the last good value when a refresh fails. */
export function usePoll<T>(fetcher: () => Promise<T>, everyMs: number, enabled = true): Poll<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; at: number }>({ data: null, error: null, at: 0 })
  const fn = useRef(fetcher)
  fn.current = fetcher
  const run = useCallback(async () => {
    try {
      const data = await fn.current()
      setState({ data, error: null, at: Date.now() })
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [])
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
      run()
      clearInterval(timer)
      timer = setInterval(run, everyMs)
    }
    const vis = () => (document.visibilityState === 'visible' ? start() : clearInterval(timer))
    start()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [enabled, everyMs, run])
  return { ...state, refresh: run }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init)
  const ct = r.headers.get('content-type') ?? ''
  if (!ct.includes('json')) throw new Error('The Trillion server is not reachable from here.')
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(j.error ?? j.reason ?? `Server responded ${r.status}`)
  return j as T
}

export interface BotPayload {
  now: number
  state: BotState
  journal: JournalEntry[]
  config: {
    riskPct: number
    dailyLossPct: number
    startEquity: number
    costs: Record<string, { preset: string; label: string; maxCostR: number }>
    seed: { asOf: string; days: number; source: string }
    controls: boolean
  }
}
export interface Section<T> {
  t: number
  data: T | null
  stale?: string
}
export interface NewsItem {
  title: string
  link: string
  t: number
  source: string
}
export interface CalEvent {
  title: string
  currency: string
  t: number
  impact: string
  forecast: string
  previous: string
}
export interface Ipo {
  symbol: string
  company: string
  exchange: string
  price: string
  shares: string
  value: string
  date: string
  status: string
}
export interface IntelPayload {
  now: number
  sections: { calendar?: Section<CalEvent[]>; ipos?: Section<Ipo[]>; markets?: Section<NewsItem[]>; crypto?: Section<NewsItem[]>; ai?: Section<NewsItem[]>; defense?: Section<NewsItem[]> }
}
export interface TrendCoin {
  id: string
  name: string
  symbol: string
  rank: number | null
  thumb: string | null
  price: number | null
  change24h: number | null
  marketCap: string | null
  volume: string | null
}
export interface Pool {
  network: string
  dex: string
  pool: string
  name: string
  symbol: string
  token: string
  image: string | null
  price: number | null
  fdv: number | null
  liquidity: number | null
  createdAt: number | null
  chg: { m5: number | null; h1: number | null; h6: number | null; h24: number | null }
  vol: { h1: number | null; h6: number | null; h24: number | null }
  tx: { h1: { buys: number; sells: number; buyers: number; sellers: number } | null; h24: { buys: number; sells: number; buyers: number; sellers: number } | null }
}
export interface FomoView {
  enabled: boolean
  t?: number
  since?: number
  tracked?: { wallets: number; trades: number }
  topTokens?: { symbol: string; name: string; mint: string; buys: number; buyers: number }[]
  leaders?: { wallet: string; pnl: number; volume: number; closed: number; winRate: number }[]
  leaderBuys?: { t: number; wallet: string; symbol: string; mint: string; usd: number }[]
  error?: string
}
export interface TrendsPayload {
  now: number
  sections: { coins?: Section<TrendCoin[]>; trending?: Section<Pool[]>; solana?: Section<Pool[]>; fresh?: Section<Pool[]> }
  fomo: FomoView
}
export interface Mover {
  coin: string
  name: string
  group: 'crypto' | 'stocks'
  px: number
  chg: number
  volume: number
}

async function loadMovers(): Promise<Mover[]> {
  const [main, xyz] = await Promise.all([hlInfo({ type: 'metaAndAssetCtxs' }), hlInfo({ type: 'metaAndAssetCtxs', dex: 'xyz' })])
  const rows = (res: any, group: Mover['group'], minVol: number): Mover[] =>
    (res?.[0]?.universe ?? [])
      .map((u: any, i: number): Mover | null => {
        const c = res[1]?.[i]
        const px = Number(c?.markPx)
        const prev = Number(c?.prevDayPx)
        const volume = Number(c?.dayNtlVlm)
        if (u.isDelisted || !(px > 0) || !(prev > 0) || !(volume >= minVol)) return null
        return { coin: u.name, name: String(u.name).replace(/^xyz:/, ''), group, px, chg: (px / prev - 1) * 100, volume }
      })
      .filter(Boolean) as Mover[]
  return [...rows(main, 'crypto', 5_000_000), ...rows(xyz, 'stocks', 1_000_000)]
}

interface Store {
  quotes: Partial<Record<MarketId, Quote>>
  live: LiveStatus
  bot: Poll<BotPayload>
  intel: Poll<IntelPayload>
  trends: Poll<TrendsPayload>
  movers: Poll<Mover[]>
  kickBot: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

const toQuote = (ctx: any): Quote | null => {
  const px = Number(ctx?.markPx ?? ctx?.midPx)
  const prev = Number(ctx?.prevDayPx)
  if (!(px > 0)) return null
  return { px, prev, chg: prev > 0 ? (px / prev - 1) * 100 : 0, volume: Number(ctx?.dayNtlVlm) || 0, funding: Number(ctx?.funding) || 0, t: Date.now() }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Store['quotes']>({})
  const [live, setLive] = useState<LiveStatus>('connecting')

  useEffect(() => {
    const pending: Store['quotes'] = {}
    let raf = 0
    const flush = () => {
      raf = 0
      setQuotes((q) => ({ ...q, ...pending }))
    }
    const offs = MARKET_IDS.map((id) =>
      subscribe({ type: 'activeAssetCtx', coin: MARKETS[id].hl }, (d) => {
        const q = toQuote(d.ctx)
        if (!q) return
        pending[id] = q
        if (!raf) raf = requestAnimationFrame(flush)
      }),
    )
    const offStatus = onStatus(setLive)
    return () => {
      offs.forEach((off) => off())
      offStatus()
      cancelAnimationFrame(raf)
    }
  }, [])

  // If the socket is down, fall back to polling so prices never freeze silently.
  useEffect(() => {
    if (live === 'live') return
    const poll = async () => {
      try {
        const [main, xyz] = await Promise.all([hlInfo({ type: 'metaAndAssetCtxs' }), hlInfo({ type: 'metaAndAssetCtxs', dex: 'xyz' })])
        const next: Store['quotes'] = {}
        for (const id of MARKET_IDS) {
          const res = MARKETS[id].hl.startsWith('xyz:') ? xyz : main
          const i = res[0].universe.findIndex((u: any) => u.name === MARKETS[id].hl)
          const q = i >= 0 ? toQuote(res[1][i]) : null
          if (q) next[id] = q
        }
        setQuotes((q) => ({ ...q, ...next }))
      } catch {
        /* keep the last values; the socket keeps retrying */
      }
    }
    const first = setTimeout(poll, 2500)
    const timer = setInterval(poll, 10_000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [live])

  const bot = usePoll<BotPayload>(() => api('/api/bot'), 30_000)
  const intel = usePoll<IntelPayload>(() => api('/api/intel'), 5 * 60_000)
  const trends = usePoll<TrendsPayload>(() => api('/api/trends'), 3 * 60_000)
  const movers = usePoll<Mover[]>(loadMovers, 60_000)

  // Client-side safety net: if the scheduler has missed two cycles, ask the server to run one now.
  const kicked = useRef(0)
  const kickBot = useCallback(async () => {
    kicked.current = Date.now()
    await api('/api/bot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"action":"kick"}' }).catch(() => {})
    bot.refresh()
  }, [bot.refresh])
  useEffect(() => {
    const s = bot.data?.state
    if (!s || !bot.at) return
    const stale = bot.data!.now - s.lastTickAt > 11 * 60_000
    if (stale && Date.now() - kicked.current > 5 * 60_000) kickBot()
  }, [bot.data, bot.at, kickBot])

  const value = useMemo(() => ({ quotes, live, bot, intel, trends, movers, kickBot }), [quotes, live, bot, intel, trends, movers, kickBot])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside DataProvider')
  return v
}

/** Re-render on a timer for countdowns and "x minutes ago" labels. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}
