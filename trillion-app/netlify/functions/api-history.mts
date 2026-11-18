import type { Config } from '@netlify/functions'
import { MARKETS, mexcCandles, type MarketId } from '../../src/data/candles'

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': cache } })

/** 5-minute history for markets whose source cannot be called from a browser (oil on MEXC). */
export default async (req: Request) => {
  const u = new URL(req.url)
  const m = MARKETS[u.searchParams.get('market') as MarketId]
  const start = Number(u.searchParams.get('start'))
  const end = Number(u.searchParams.get('end'))
  if (!m?.mexc) return json({ error: 'No server-side history for that market.' }, 400)
  if (!(start > 0 && end > start && end - start <= 62 * 86_400_000)) return json({ error: 'Ask for at most 62 days at a time.' }, 400)
  try {
    const c = await mexcCandles(m.mexc, '5m', start, end)
    const rows = c.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v])
    // Windows that ended more than an hour ago never change, so the CDN may keep them.
    return json({ market: m.id, candles: rows }, 200, end < Date.now() - 3_600_000 ? 'public, s-maxage=86400' : 'public, s-maxage=300')
  } catch (e) {
    return json({ error: `Oil history is unavailable right now (${e instanceof Error ? e.message : String(e)}).` }, 502)
  }
}

export const config: Config = { path: '/api/history' }
