/**
 * Replay recent real history through the bot, bar by bar, and print the
 * resulting state. Used to preview the Bot screen with realistic data and to
 * sanity-check a full multi-day run. Never writes to the live store.
 *   npx tsx scripts/replay.ts > replay.json
 */
import { cfgFor, initState, runTick } from '../src/bot/core'
import seed from '../src/bot/seed.json'
import { BOT, BOT_COSTS, BOT_MARKETS, type BotMarket, type JournalEntry } from '../src/bot/types'
import { hlCandles, MARKETS, sanitize } from '../src/data/candles'
import { COST_PRESETS, type Candle } from '../src/engine/types'

const end = Math.floor(Date.now() / BOT.tfMs) * BOT.tfMs
const series = {} as Record<BotMarket, Candle[]>
for (const m of BOT_MARKETS) series[m] = sanitize(await hlCandles(MARKETS[m].hl, '5m', end - 18 * 86_400_000, end), BOT.tfMs).candles
const first = Math.max(series.BTC[1900].t, series.GOLD[1900].t)
let now = first + BOT.tfMs + 1000
const state = initState(now, seed.tracks)
const journal: JournalEntry[] = []
const deps = { now: () => now, candles: async (m: BotMarket) => series[m].filter((b) => b.t + BOT.tfMs <= now).slice(-BOT.window) }
while (now < end + BOT.tfMs) {
  await runTick(state, journal, deps)
  now += BOT.tfMs
}
now -= BOT.tfMs
const config = {
  ...BOT,
  costs: Object.fromEntries(BOT_MARKETS.map((m) => [m, { preset: BOT_COSTS[m], label: COST_PRESETS[BOT_COSTS[m]].label, maxCostR: cfgFor(m).maxCostR }])),
  seed: { asOf: seed.asOf, days: seed.days, source: seed.source },
  controls: false,
}
process.stderr.write(`replayed ${state.ticks} cycles: ${journal.length} trades (${journal.filter((j) => j.taken).length} paper), equity ${state.equity.toFixed(2)}, lessons ${state.lessons.length}, incidents ${state.incidents.length}\n`)
for (const t of Object.values(state.tracks)) process.stderr.write(`  ${t.id.padEnd(15)} ${t.status.padEnd(8)} n=${t.n} sumR=${t.sumR.toFixed(2)} paper=${t.takenN} pnl=${t.takenPnl.toFixed(2)}\n`)
process.stdout.write(JSON.stringify({ now, state, journal: journal.slice(-400).reverse(), config }))
