/**
 * Give each bot track its starting evidence: a one-year backtest at the
 * market's own cost model. Writes src/bot/seed.json.
 *   npx tsx scripts/seed.ts [days=365] [cacheDir]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cfgFor } from '../src/bot/core'
import { BOT_MARKETS } from '../src/bot/types'
import { binanceCandles, MARKETS, sanitize } from '../src/data/candles'
import { runBacktest } from '../src/engine/backtest'
import { STRATEGY_IDS } from '../src/engine/strategies'
import type { Candle } from '../src/engine/types'

const days = Number(process.argv[2] ?? 365)
const cacheDir = process.argv[3] ?? '.cache'
mkdirSync(cacheDir, { recursive: true })
const now = Math.floor(Date.now() / 86_400_000) * 86_400_000
const tracks: Record<string, { expR: number; n: number; winRate: number; netPct: number; oosExpR: number; oosN: number }> = {}
for (const market of BOT_MARKETS) {
  const sym = MARKETS[market].binance!
  const f = join(cacheDir, `${sym}-${days}d-${now}.json`)
  const c: Candle[] = existsSync(f)
    ? JSON.parse(readFileSync(f, 'utf8'))
    : sanitize(await binanceCandles(sym, '5m', now - days * 86_400_000, now), 300_000).candles
  if (!existsSync(f)) writeFileSync(f, JSON.stringify(c))
  for (const id of STRATEGY_IDS) {
    const r = runBacktest(c, id, {}, cfgFor(market))
    const round = (x: number) => Math.round(x * 1000) / 1000
    tracks[`${market}:${id}`] = {
      expR: round(r.all.expectancyR),
      n: r.all.trades,
      winRate: round(r.all.winRate),
      netPct: round(r.all.netPct),
      oosExpR: round(r.outOfSample.expectancyR),
      oosN: r.outOfSample.trades,
    }
  }
}
const out = { asOf: new Date(now).toISOString().slice(0, 10), days, source: 'Binance BTCUSDT and PAXGUSDT, 5m', tracks }
writeFileSync('src/bot/seed.json', JSON.stringify(out, null, 2) + '\n')
console.log(JSON.stringify(out, null, 1))
