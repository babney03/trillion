/**
 * Run every strategy on real history from the command line.
 *   npm run backtest -- [days=120] [cacheDir]
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { binanceCandles, hlCandles, MARKETS, sanitize } from '../src/data/candles'
import { runBacktest, walkForward } from '../src/engine/backtest'
import { STRATEGY_IDS } from '../src/engine/strategies'
import { DEFAULT_CFG, type Candle } from '../src/engine/types'

const days = Number(process.argv[2] ?? 120)
const cacheDir = process.argv[3] ?? '.cache'
const M5 = 300_000
mkdirSync(cacheDir, { recursive: true })

async function load(name: string, fetcher: () => Promise<Candle[]>): Promise<Candle[]> {
  const f = join(cacheDir, `${name}-${days}d.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const c = sanitize(await fetcher(), M5).candles
  writeFileSync(f, JSON.stringify(c))
  return c
}

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '∞')
const now = Math.floor(Date.now() / M5) * M5
const sets: [string, () => Promise<Candle[]>][] = [
  [`BTC (Binance BTCUSDT, ${days}d)`, () => binanceCandles(MARKETS.BTC.binance!, '5m', now - days * 86_400_000, now)],
  [`GOLD (Binance PAXGUSDT, ${days}d)`, () => binanceCandles(MARKETS.GOLD.binance!, '5m', now - days * 86_400_000, now)],
  ['GOLD (Hyperliquid xyz:GOLD, ~17d)', () => hlCandles(MARKETS.GOLD.hl, '5m', now - 17 * 86_400_000, now)],
]

for (const [label, fetcher] of sets) {
  const c = await load(label.replace(/[^a-z0-9]+/gi, '_'), fetcher)
  console.log(`\n=== ${label}: ${c.length} bars, ${new Date(c[0].t).toISOString().slice(0, 10)} → ${new Date(c[c.length - 1].t).toISOString().slice(0, 10)}`)
  console.log('strategy    trades  win%   expR    PF   net%   maxDD%  sharpe | OOS: trades expR  net% | MC p5..p95 net%   | B&H net% / DD%')
  for (const id of STRATEGY_IDS) {
    const t0 = Date.now()
    const r = runBacktest(c, id, {}, DEFAULT_CFG)
    const a = r.all
    const o = r.outOfSample
    const mc = r.monteCarlo
    console.log(
      `${id.padEnd(11)} ${String(a.trades).padStart(6)} ${fmt(a.winRate * 100).padStart(5)} ${fmt(a.expectancyR, 2).padStart(6)} ${fmt(a.profitFactor, 2).padStart(5)} ${fmt(a.netPct).padStart(6)} ${fmt(a.maxDDPct).padStart(7)} ${fmt(a.sharpe, 2).padStart(7)} | ${String(o.trades).padStart(10)} ${fmt(o.expectancyR, 2).padStart(5)} ${fmt(o.netPct).padStart(5)} | ${mc ? `${fmt(mc.netPct.p5)} .. ${fmt(mc.netPct.p95)}`.padEnd(17) : 'n/a'.padEnd(17)} | ${fmt(r.buyHold.netPct)} / ${fmt(r.buyHold.maxDDPct)}   (${Date.now() - t0}ms)`,
    )
  }
  if (c.length > 20_000) {
    for (const id of STRATEGY_IDS) {
      const t0 = Date.now()
      const wf = walkForward(c, id, DEFAULT_CFG, { trainBars: 8640, testBars: 2880 })
      console.log(`  walk-forward ${id.padEnd(10)} windows=${wf.windows.length} combos=${wf.combos} OOS trades=${wf.oos.trades} expR=${fmt(wf.oos.expectancyR, 2)} totalR=${fmt(wf.oos.totalR)} efficiency=${fmt(wf.efficiency, 2)} (${Date.now() - t0}ms)`)
    }
  }
}
