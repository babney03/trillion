import type { Config } from '@netlify/functions'
import { store } from '../lib/cycle'
import { clean, fetchJson, newsFrom, refreshSections, type Section } from '../lib/feeds'

const gnews = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:2d')}&hl=en-US&gl=US&ceid=US:en`

const FEEDS: Record<string, [string, string][]> = {
  markets: [
    ['MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
    ['investingLive', 'https://investinglive.com/feed/news'],
    ['Google News', gnews('gold price OR "S&P 500" OR Nasdaq OR "Federal Reserve"')],
  ],
  crypto: [
    ['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'],
    ['Cointelegraph', 'https://cointelegraph.com/rss'],
    ['Decrypt', 'https://decrypt.co/feed'],
  ],
  ai: [
    ['TechCrunch', 'https://techcrunch.com/category/artificial-intelligence/feed/'],
    ['The Verge', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'],
    ['Ars Technica', 'https://feeds.arstechnica.com/arstechnica/technology-lab'],
    ['Google News', gnews('Nvidia OR OpenAI OR Anthropic OR "AI stocks" OR semiconductor')],
  ],
  defense: [
    ['Defense News', 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml'],
    ['Breaking Defense', 'https://breakingdefense.com/feed/'],
    ['Defense One', 'https://www.defenseone.com/rss/all/'],
    ['The War Zone', 'https://www.twz.com/feed'],
    ['Google News', gnews('"defense stocks" OR Lockheed OR RTX OR Palantir OR Anduril contract')],
  ],
}

async function calendar() {
  const rows = await fetchJson<any[]>('https://nfs.faireconomy.media/ff_calendar_thisweek.json')
  if (!Array.isArray(rows) || !rows.length) throw new Error('calendar was empty')
  return rows
    .map((r) => ({ title: String(r.title ?? ''), currency: String(r.country ?? ''), t: Date.parse(r.date), impact: String(r.impact ?? ''), forecast: String(r.forecast ?? ''), previous: String(r.previous ?? '') }))
    .filter((r) => r.title && Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t)
}

async function ipos() {
  const month = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', origin: 'https://www.nasdaq.com', referer: 'https://www.nasdaq.com/' }
  const pages = await Promise.all([month(now), month(next)].map((m) => fetchJson<any>(`https://api.nasdaq.com/api/ipo/calendar?date=${m}`, headers).catch(() => null)))
  if (pages.every((p) => !p?.data)) throw new Error('IPO calendar unavailable')
  const row = (r: any, status: string, date: string) => ({
    symbol: clean(String(r.proposedTickerSymbol ?? '')),
    company: clean(String(r.companyName ?? '')),
    exchange: clean(String(r.proposedExchange ?? '')),
    price: clean(String(r.proposedSharePrice ?? '')),
    shares: clean(String(r.sharesOffered ?? '')),
    value: clean(String(r.dollarValueOfSharesOffered ?? '')),
    date: clean(String(date ?? '')),
    status,
  })
  const out: ReturnType<typeof row>[] = []
  for (const p of pages) {
    const d = p?.data
    if (!d) continue
    for (const r of d.upcoming?.upcomingTable?.rows ?? []) out.push(row(r, 'upcoming', r.expectedPriceDate))
    for (const r of d.priced?.rows ?? []) out.push(row(r, 'priced', r.pricedDate))
    for (const r of d.filed?.rows ?? []) out.push(row(r, 'filed', r.filedDate))
  }
  const seen = new Set<string>()
  return out.filter((r) => r.company && !seen.has(r.status + r.company) && seen.add(r.status + r.company))
}

const TTL = 10 * 60_000

export default async () => {
  const s = store()
  const cache = (await s.get('cache/intel', { type: 'json' }).catch(() => null)) as Record<string, Section<unknown>> | null
  const loaders: Record<string, () => Promise<unknown>> = {
    calendar,
    ipos,
    ...Object.fromEntries(Object.entries(FEEDS).map(([k, feeds]) => [k, async () => (await newsFrom(feeds)).items])),
  }
  const due = Object.keys(loaders).filter((k) => !cache?.[k] || cache[k].stale || Date.now() - cache[k].t > TTL)
  let sections = cache ?? {}
  if (due.length) {
    sections = await refreshSections(cache, loaders, due)
    await s.setJSON('cache/intel', sections).catch(() => {})
  }
  return new Response(JSON.stringify({ now: Date.now(), sections }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
      'netlify-cdn-cache-control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  })
}

export const config: Config = { path: '/api/intel' }
