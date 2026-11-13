/**
 * fomo wallet tracker. EXPERIMENTAL and not yet run against live data: it
 * stays off until a BITQUERY_TOKEN environment variable is set on the site.
 *
 * fomo has no public API and its leaderboard is behind login. Its Solana
 * trades are visible on-chain though: Bitquery's guide identifies them by the
 * app's signer wallet. This function records those trades, keeps a running
 * profit estimate per user wallet, and ranks them, so the app can show what
 * the most profitable tracked wallets are buying. Wallet addresses only.
 * The signer address comes from Bitquery's analysis; fomo has not confirmed it.
 */
import type { Config } from '@netlify/functions'
import { store } from '../lib/cycle'

const SIGNER = 'AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const WSOL = 'So11111111111111111111111111111111111111112'
const QUOTE = new Set([USDC, WSOL, '11111111111111111111111111111111'])
const DAY = 86_400_000

const WHERE = `Transaction: {Signer: {is: "${SIGNER}"}}, Trade: {Dex: {ProtocolName: {is: "dflow"}}}`

const Q_TRADES = `query FomoLatestTrades {
  Solana {
    DEXTrades(limit: {count: 1500}, orderBy: {descending: Block_Time}, where: {${WHERE}}) {
      Block { Time }
      Transaction { Signature }
      Trade {
        Buy { Amount AmountInUSD Account { Owner } Currency { Symbol MintAddress } }
        Sell { Amount AmountInUSD Currency { Symbol MintAddress } }
      }
    }
  }
}`

const Q_TOP = `query FomoTopTokensBought {
  Solana {
    DEXTradeByTokens(
      limit: {count: 20}
      orderBy: {descendingByField: "buyers"}
      where: {
        Transaction: {Signer: {is: "${SIGNER}"}}
        Trade: {Dex: {ProtocolName: {is: "dflow"}}, Side: {Type: {is: buy}}, Currency: {MintAddress: {notIn: ["${USDC}", "${WSOL}"]}}}
        Block: {Time: {since_relative: {hours_ago: 1}}}
      }
    ) {
      Trade { Currency { Symbol Name MintAddress } }
      buys: count(distinct: Transaction_Signature)
      buyers: count(distinct: Trade_Account_Owner)
    }
  }
}`

async function bitquery(query: string, token: string): Promise<any> {
  const r = await fetch(process.env.BITQUERY_ENDPOINT ?? 'https://streaming.bitquery.io/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!r.ok) throw new Error(`Bitquery responded ${r.status}`)
  const j = await r.json()
  if (j.errors?.length) throw new Error(`Bitquery: ${String(j.errors[0]?.message ?? 'query error').slice(0, 160)}`)
  return j.data
}

interface Holding {
  qty: number
  cost: number
  symbol: string
}
interface Wallet {
  /** Realised profit in USD by UTC day, so old days can roll off. */
  days: Record<string, { pnl: number; vol: number; closed: number; wins: number }>
  pos: Record<string, Holding>
  last: number
}
interface TrackerState {
  since: number
  lastT: number
  seen: string[]
  wallets: Record<string, Wallet>
  buys: { t: number; wallet: string; symbol: string; mint: string; usd: number }[]
  trades: number
}

export default async () => {
  const token = process.env.BITQUERY_TOKEN
  if (!token) return new Response('fomo tracker is off: BITQUERY_TOKEN is not set')
  const s = store()
  const now = Date.now()
  const st: TrackerState = ((await s.get('fomo/state', { type: 'json' }).catch(() => null)) as TrackerState | null) ?? {
    since: now,
    lastT: 0,
    seen: [],
    wallets: {},
    buys: [],
    trades: 0,
  }
  let error: string | undefined
  let topTokens: unknown[] = []
  try {
    const [trades, top] = await Promise.all([bitquery(Q_TRADES, token), bitquery(Q_TOP, token)])
    topTokens = (top?.Solana?.DEXTradeByTokens ?? []).map((r: any) => ({
      symbol: String(r.Trade?.Currency?.Symbol ?? '').slice(0, 24),
      name: String(r.Trade?.Currency?.Name ?? '').slice(0, 60),
      mint: String(r.Trade?.Currency?.MintAddress ?? ''),
      buys: Number(r.buys) || 0,
      buyers: Number(r.buyers) || 0,
    }))
    const seen = new Set(st.seen)
    const rows = [...(trades?.Solana?.DEXTrades ?? [])].reverse() // oldest first
    for (const r of rows) {
      const sig = String(r.Transaction?.Signature ?? '')
      const t = Date.parse(r.Block?.Time)
      const wallet = String(r.Trade?.Buy?.Account?.Owner ?? '')
      if (!sig || !wallet || !Number.isFinite(t) || t < st.lastT - 60_000 || seen.has(sig)) continue
      seen.add(sig)
      st.trades++
      const buy = r.Trade.Buy
      const sell = r.Trade.Sell
      const buyMint = String(buy?.Currency?.MintAddress ?? '')
      const sellMint = String(sell?.Currency?.MintAddress ?? '')
      const usd = Number(buy?.AmountInUSD) || Number(sell?.AmountInUSD) || 0
      const w = (st.wallets[wallet] ??= { days: {}, pos: {}, last: t })
      w.last = t
      const day = (w.days[String(Math.floor(t / DAY))] ??= { pnl: 0, vol: 0, closed: 0, wins: 0 })
      day.vol += usd
      if (!QUOTE.has(buyMint) && QUOTE.has(sellMint)) {
        // Wallet bought a token with USDC or SOL.
        const h = (w.pos[buyMint] ??= { qty: 0, cost: 0, symbol: String(buy.Currency.Symbol ?? '').slice(0, 24) })
        h.qty += Number(buy.Amount) || 0
        h.cost += usd
        st.buys.push({ t, wallet, symbol: h.symbol, mint: buyMint, usd })
      } else if (QUOTE.has(buyMint) && !QUOTE.has(sellMint)) {
        // Wallet sold a token. Only the part bought while tracking has a known cost.
        const h = w.pos[sellMint]
        const qty = Number(sell.Amount) || 0
        if (h && h.qty > 0 && qty > 0) {
          const part = Math.min(1, h.qty / qty)
          const basis = (h.cost / h.qty) * Math.min(h.qty, qty)
          const pnl = usd * part - basis
          day.pnl += pnl
          day.closed++
          if (pnl > 0) day.wins++
          h.cost -= basis
          h.qty -= Math.min(h.qty, qty)
          if (h.qty <= 1e-9) delete w.pos[sellMint]
        }
      }
      if (t > st.lastT) st.lastT = t
    }
    st.seen = [...seen].slice(-4000)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  // Keep a rolling week and a bounded number of wallets.
  const minDay = Math.floor((now - 7 * DAY) / DAY)
  for (const [addr, w] of Object.entries(st.wallets)) {
    for (const d of Object.keys(w.days)) if (Number(d) < minDay) delete w.days[d]
    if (!Object.keys(w.days).length && now - w.last > 7 * DAY) delete st.wallets[addr]
  }
  const addrs = Object.keys(st.wallets)
  if (addrs.length > 4000) {
    addrs.sort((a, b) => st.wallets[a].last - st.wallets[b].last).slice(0, addrs.length - 4000).forEach((a) => delete st.wallets[a])
  }
  st.buys = st.buys.filter((b) => now - b.t < 6 * 3_600_000).slice(-3000)

  const leaders = Object.entries(st.wallets)
    .map(([wallet, w]) => {
      const d = Object.values(w.days)
      const closed = d.reduce((a, x) => a + x.closed, 0)
      return { wallet, pnl: d.reduce((a, x) => a + x.pnl, 0), volume: d.reduce((a, x) => a + x.vol, 0), closed, winRate: closed ? d.reduce((a, x) => a + x.wins, 0) / closed : 0 }
    })
    .filter((l) => l.closed >= 3 && l.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 25)
  const top = new Set(leaders.map((l) => l.wallet))
  const leaderBuys = st.buys.filter((b) => top.has(b.wallet)).slice(-60).reverse()

  await s.setJSON('fomo/state', st)
  await s.setJSON('fomo/view', { enabled: true, t: now, since: st.since, tracked: { wallets: Object.keys(st.wallets).length, trades: st.trades }, topTokens, leaders, leaderBuys, error })
  return new Response(error ? `fomo tracker error: ${error}` : 'ok')
}

export const config: Config = { schedule: '*/15 * * * *' }
