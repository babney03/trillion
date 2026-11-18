import type { BotPayload, IntelPayload, Mover, Quote, TrendsPayload } from './data'
import { MARKETS, type MarketId } from '../data/candles'
import { STRATEGIES } from '../engine/strategies'

export type TabId = 'command' | 'markets' | 'intel' | 'trends' | 'bot' | 'backtest' | 'trades'

export interface Snapshot {
  quotes: Partial<Record<MarketId, Quote>>
  bot: BotPayload | null
  intel: IntelPayload | null
  trends: TrendsPayload | null
  movers: Mover[] | null
  now: number
}

export interface Reply {
  text: string
  go?: TabId
  market?: MarketId
}

const say = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (x: number) => `${x >= 0 ? 'up' : 'down'} ${Math.abs(x).toFixed(Math.abs(x) < 10 ? 2 : 1)} percent`
const money = (x: number) => `${x < 0 ? 'minus ' : ''}${say(Math.abs(x), 2)} dollars`

const MARKET_WORDS: [MarketId, RegExp][] = [
  ['GOLD', /\b(gold|xau|xauusd|bullion)\b/],
  ['BTC', /\b(bitcoin|btc)\b/],
  ['OIL', /\b(oil|crude|wti|usoil)\b/],
  ['SP500', /(s\s?&\s?p|s and p|\bsp ?500\b|\bspx\b|\bes\b|standard and poor)/],
  ['NAS100', /\b(nasdaq|nas|nq|nas ?100|tech index)\b/],
]

function quoteLine(id: MarketId, q?: Quote): string {
  if (!q) return `I have no live price for ${MARKETS[id].name} right now.`
  return `${MARKETS[id].name} is at ${say(q.px, MARKETS[id].decimals)}, ${pct(q.chg)} on the day.`
}

function botLine(b: BotPayload | null, now: number): string {
  if (!b) return "I can't reach the bot right now."
  const s = b.state
  const total = (s.equity / s.startEquity - 1) * 100
  const today = s.equity - s.day.startEquity
  const open = Object.values(s.tracks).filter((t) => t.sim.position?.taken)
  const mins = Math.round((now - s.lastTickAt) / 60_000)
  const health = s.lastTickAt === 0 ? 'It has not completed its first cycle yet.' : mins > 11 ? `Warning: its last cycle was ${mins} minutes ago.` : 'It is running normally.'
  const pos = open.length
    ? `It holds ${open.map((t) => `a ${t.sim.position!.side} on ${t.market}`).join(' and ')}.`
    : 'It has no open positions.'
  return `Paper equity is ${money(s.equity)}, ${Math.abs(total) < 0.005 ? 'unchanged' : pct(total)} overall and ${Math.abs(today) < 0.005 ? 'flat' : `${today > 0 ? 'up' : 'down'} ${say(Math.abs(today), 2)} dollars`} today. ${pos} ${s.paused ? 'The bot is paused.' : s.day.halted ? 'It hit the daily loss limit and is standing aside until tomorrow.' : health}`
}

function nextEvents(i: IntelPayload | null, now: number, n = 2): string {
  const ev = (i?.sections.calendar?.data ?? []).filter((e) => e.t > now && e.currency === 'USD' && e.impact === 'High').slice(0, n)
  if (!ev.length) return 'There are no more high-impact US events on the calendar this week.'
  return ev
    .map((e, k) => {
      const mins = Math.round((e.t - now) / 60_000)
      const when = mins < 60 ? `in ${mins} minutes` : mins < 1440 ? `in ${Math.round(mins / 60)} hours` : `on ${new Date(e.t).toLocaleDateString([], { weekday: 'long' })} at ${new Date(e.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      return `${k === 0 ? 'Next high-impact US event' : 'Then'}: ${e.title}, ${when}${e.forecast ? `, forecast ${e.forecast}` : ''}.`
    })
    .join(' ')
}

/** Turn a spoken or typed request into an answer from live data. Pure, so it can be tested. */
export function answer(input: string, s: Snapshot): Reply {
  const q = input.toLowerCase().replace(/[?.!,]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return { text: 'I did not catch that.' }

  const nav = q.match(/\b(open|show|go to|switch to|take me to)\b.*\b(command|home|markets?|charts?|intel|news|calendar|trends?|bot|backtest(ing)?|journal|my trades)\b/)
  if (nav) {
    const w = nav[2]
    const go: TabId = /journal|my trades/.test(w) ? 'trades' : /market|chart/.test(w) ? 'markets' : /intel|news|calendar/.test(w) ? 'intel' : /trend/.test(w) ? 'trends' : /backtest/.test(w) ? 'backtest' : w === 'bot' ? 'bot' : 'command'
    return { text: `Opening ${go}.`, go }
  }
  if (/\b(help|what can you do|commands)\b/.test(q)) {
    return { text: 'Ask me for a market brief, the price of gold, oil, bitcoin, the S and P or the Nasdaq, oil news, how the bot is doing, what it has learned, the next news event, upcoming IPOs, top movers, or trending coins. I can also open any tab.' }
  }
  if (/\b(learn|learned|learnt|lesson|mistake|benched?)\b/.test(q)) {
    const l = s.bot?.state.lessons ?? []
    if (!s.bot) return { text: "I can't reach the bot right now.", go: 'bot' }
    const benched = Object.values(s.bot.state.tracks).filter((t) => t.status === 'benched')
    const latest = l[l.length - 1]
    const bench = benched.length ? `${benched.length} of ${Object.keys(s.bot.state.tracks).length} strategy tracks are benched and trading in shadow: ${benched.map((t) => `${STRATEGIES[t.strategy].name} on ${t.market}`).join(', ')}.` : 'Every strategy track is active.'
    return { text: `${bench} ${latest ? `Latest note: ${latest.msg}` : 'No new lessons from live trades yet.'}`, go: 'bot' }
  }
  if (/\b(open (trades?|positions?)|any trades?|positions?)\b/.test(q)) {
    if (!s.bot) return { text: "I can't reach the bot right now." }
    const open = Object.values(s.bot.state.tracks).filter((t) => t.sim.position)
    if (!open.length) return { text: 'No open positions, paper or shadow.', go: 'bot' }
    return {
      text: open.map((t) => `${t.sim.position!.taken ? 'Paper' : 'Shadow'} ${t.sim.position!.side} on ${t.market} from ${say(t.sim.position!.entry, MARKETS[t.market].decimals)}, stop ${say(t.sim.position!.stop, MARKETS[t.market].decimals)}, target ${say(t.sim.position!.target, MARKETS[t.market].decimals)}.`).join(' '),
      go: 'bot',
    }
  }
  if (/\b(bot|pnl|p and l|profit|equity|account|how are we doing|performance)\b/.test(q)) return { text: botLine(s.bot, s.now), go: 'bot' }
  if (/\b(ipos?|listings?|going public)\b/.test(q)) {
    const up = (s.intel?.sections.ipos?.data ?? []).filter((i) => i.status === 'upcoming').slice(0, 4)
    return { text: up.length ? `Upcoming IPOs: ${up.map((i) => `${i.company}${i.date ? ` on ${i.date}` : ''}`).join('; ')}.` : 'I see no upcoming IPOs on the Nasdaq calendar right now.', go: 'intel' }
  }
  if (/\b(event|calendar|cpi|fomc|nfp|payrolls|fed|data release|next news|news today|red folder)\b/.test(q)) return { text: nextEvents(s.intel, s.now), go: 'intel' }
  if (/\b(trending|hot coins?|meme ?coins?|fomo|new coins?)\b/.test(q)) {
    const coins = (s.trends?.sections.coins?.data ?? []).slice(0, 5)
    return { text: coins.length ? `Trending now: ${coins.map((c) => `${c.name}${c.change24h !== null ? `, ${pct(c.change24h)}` : ''}`).join('; ')}.` : 'I have no trending data right now.', go: 'trends' }
  }
  if (/\b(movers?|big moves?|gainers?|losers?|what'?s moving)\b/.test(q)) {
    const m = [...(s.movers ?? [])].sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 4)
    return { text: m.length ? `Biggest moves: ${m.map((x) => `${x.name} ${pct(x.chg)}`).join('; ')}.` : 'I have no movers data right now.', go: 'markets' }
  }
  if (/\b(headlines?|news)\b/.test(q)) {
    const key = /\b(ai|tech)\b/.test(q) ? 'ai' : /\b(defen[cs]e|military)\b/.test(q) ? 'defense' : /\bcrypto\b/.test(q) ? 'crypto' : /\b(oil|crude|energy|opec)\b/.test(q) ? 'energy' : 'markets'
    const items = (s.intel?.sections[key]?.data ?? []).slice(0, 3)
    return { text: items.length ? `Latest ${key === 'ai' ? 'AI and tech' : key === 'energy' ? 'oil and energy' : key} headlines. ${items.map((i) => i.title).join('. ')}.` : 'I have no headlines right now.', go: 'intel' }
  }
  const named = MARKET_WORDS.filter(([, re]) => re.test(q)).map(([id]) => id)
  if (named.length) return { text: named.map((id) => quoteLine(id, s.quotes[id])).join(' '), market: named[0] }
  if (/\b(brief|briefing|markets?|overview|summary|update|status|good morning|what'?s up)\b/.test(q)) {
    const lines = (['SP500', 'NAS100', 'GOLD', 'OIL', 'BTC'] as MarketId[]).map((id) => quoteLine(id, s.quotes[id]))
    return { text: `${lines.join(' ')} ${botLine(s.bot, s.now)} ${nextEvents(s.intel, s.now, 1)}` }
  }
  return { text: "I don't have an answer for that yet. Try: market brief, price of gold, bot status, next event, or trending coins." }
}
