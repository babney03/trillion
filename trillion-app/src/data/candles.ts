import type { Candle } from '../engine/types'

export type MarketId = 'BTC' | 'GOLD' | 'OIL' | 'SP500' | 'NAS100'

export interface Market {
  id: MarketId
  name: string
  short: string
  /** Hyperliquid coin (perpetual contract tracking the underlying). */
  hl: string
  /** Binance spot pair with deep history, where one exists. */
  binance?: string
  binanceNote?: string
  /** MEXC perpetual with deeper history, for markets Binance does not list. */
  mexc?: string
  decimals: number
}

export const MARKETS: Record<MarketId, Market> = {
  SP500: { id: 'SP500', name: 'S&P 500', short: 'S&P', hl: 'xyz:SP500', decimals: 1 },
  NAS100: { id: 'NAS100', name: 'Nasdaq 100', short: 'NAS', hl: 'xyz:XYZ100', decimals: 1 },
  GOLD: { id: 'GOLD', name: 'Gold', short: 'GOLD', hl: 'xyz:GOLD', binance: 'PAXGUSDT', binanceNote: 'PAXG, tokenised gold', decimals: 1 },
  OIL: { id: 'OIL', name: 'Crude oil (WTI)', short: 'OIL', hl: 'xyz:CL', mexc: 'USOIL_USDT', decimals: 2 },
  BTC: { id: 'BTC', name: 'Bitcoin', short: 'BTC', hl: 'BTC', binance: 'BTCUSDT', decimals: 0 },
}

export const MARKET_IDS = Object.keys(MARKETS) as MarketId[]
export const TF_MS: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 }

const HL = 'https://api.hyperliquid.xyz/info'
const BINANCE = 'https://data-api.binance.vision/api/v3/klines'

async function getJson(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<any> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal })
    if (!r.ok) throw new Error(`${new URL(url).host} responded ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function hlInfo(body: unknown): Promise<any> {
  return getJson(HL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

/** Up to ~5000 most recent bars from Hyperliquid. */
export async function hlCandles(coin: string, interval: string, startMs: number, endMs = Date.now()): Promise<Candle[]> {
  const rows = await hlInfo({ type: 'candleSnapshot', req: { coin, interval, startTime: startMs, endTime: endMs } })
  if (!Array.isArray(rows)) throw new Error('Hyperliquid returned no candle list')
  return rows.map((r: any) => ({ t: r.t, o: +r.o, h: +r.h, l: +r.l, c: +r.c, v: +r.v }))
}

/** Paginated history from Binance's public market-data mirror. */
export async function binanceCandles(
  symbol: string,
  interval: string,
  startMs: number,
  endMs = Date.now(),
  onProgress?: (fraction: number) => void,
): Promise<Candle[]> {
  const out: Candle[] = []
  let cursor = startMs
  while (cursor < endMs) {
    const rows: any[] = await getJson(`${BINANCE}?symbol=${symbol}&interval=${interval}&limit=1000&startTime=${cursor}&endTime=${endMs}`)
    if (!rows.length) break
    for (const r of rows) out.push({ t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5] })
    cursor = rows[rows.length - 1][0] + 1
    onProgress?.(Math.min(1, (cursor - startMs) / (endMs - startMs)))
    if (rows.length < 1000) break
  }
  return out
}

const MEXC = 'https://contract.mexc.com/api/v1/contract/kline'
const MEXC_IV: Record<string, string> = { '1m': 'Min1', '5m': 'Min5', '15m': 'Min15', '1h': 'Min60', '4h': 'Hour4', '1d': 'Day1' }

/**
 * History from MEXC's public futures API, paged backwards (it returns at most ~2,000 bars
 * per request, the newest in the window). Server-side only: MEXC does not allow browser calls.
 */
export async function mexcCandles(
  symbol: string,
  interval: string,
  startMs: number,
  endMs = Date.now(),
  onProgress?: (fraction: number) => void,
): Promise<Candle[]> {
  const step = (TF_MS[interval] ?? 300_000) * 1990
  const pages: Candle[][] = []
  let hi = endMs
  while (hi > startMs) {
    const lo = Math.max(startMs, hi - step)
    const j = await getJson(`${MEXC}/${symbol}?interval=${MEXC_IV[interval] ?? 'Min5'}&start=${Math.floor(lo / 1000)}&end=${Math.floor(hi / 1000)}`)
    const d = j?.data
    if (!j?.success || !Array.isArray(d?.time)) throw new Error('MEXC returned no candles')
    pages.push(d.time.map((t: number, k: number) => ({ t: t * 1000, o: +d.open[k], h: +d.high[k], l: +d.low[k], c: +d.close[k], v: +d.vol[k] })))
    onProgress?.(Math.min(1, (endMs - lo) / (endMs - startMs)))
    if (!d.time.length && lo <= startMs) break
    hi = lo
  }
  return pages.reverse().flat()
}

/** Deepest available 5-minute history for a market, from whichever source has it. */
export async function deepHistory(market: Market, startMs: number, endMs = Date.now(), onProgress?: (f: number) => void): Promise<Candle[]> {
  if (market.binance) return binanceCandles(market.binance, '5m', startMs, endMs, onProgress)
  if (market.mexc) return mexcCandles(market.mexc, '5m', startMs, endMs, onProgress)
  throw new Error(`no deep history source for ${market.name}`)
}

export interface Sanitized {
  candles: Candle[]
  filled: number
  dropped: number
}

/**
 * Make a candle list safe to trade on: sorted, de-duplicated, invalid rows
 * dropped, short gaps forward-filled with flat bars, and the still-forming
 * bar removed.
 */
export function sanitize(raw: Candle[], tfMs: number, now = Date.now(), maxFill = 12): Sanitized {
  const sorted = [...raw].sort((a, b) => a.t - b.t)
  const out: Candle[] = []
  let filled = 0
  let dropped = 0
  for (const b of sorted) {
    const ok = [b.o, b.h, b.l, b.c].every((x) => Number.isFinite(x) && x > 0) && b.h >= b.l && b.t % tfMs === 0
    if (!ok || b.t + tfMs > now) {
      dropped++
      continue
    }
    const prev = out[out.length - 1]
    if (prev) {
      if (b.t === prev.t) {
        out[out.length - 1] = b
        continue
      }
      const missing = (b.t - prev.t) / tfMs - 1
      if (missing > 0 && missing <= maxFill) {
        for (let k = 1; k <= missing; k++) {
          out.push({ t: prev.t + k * tfMs, o: prev.c, h: prev.c, l: prev.c, c: prev.c, v: 0 })
          filled++
        }
      }
    }
    out.push({ ...b, h: Math.max(b.h, b.o, b.c), l: Math.min(b.l, b.o, b.c) })
  }
  return { candles: out, filled, dropped }
}
