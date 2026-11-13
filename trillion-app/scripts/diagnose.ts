/** Cost sensitivity and exit breakdown on real history. npx tsx scripts/diagnose.ts <days> <cacheDir> */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { binanceCandles, MARKETS, sanitize } from '../src/data/candles'
import { runBacktest } from '../src/engine/backtest'
import { STRATEGY_IDS } from '../src/engine/strategies'
import { withCosts, type Candle, type CostPresetId } from '../src/engine/types'

const days = Number(process.argv[2] ?? 365)
const cacheDir = process.argv[3] ?? '.cache'
const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {}
mkdirSync(cacheDir, { recursive: true })
const now = Math.floor(Date.now() / 86_400_000) * 86_400_000
async function load(sym: string): Promise<Candle[]> {
  const f = join(cacheDir, `${sym}-${days}d-${now}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const c = sanitize(await binanceCandles(sym, '5m', now - days * 86_400_000, now), 300_000).candles
  writeFileSync(f, JSON.stringify(c))
  return c
}
const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : 'inf')
for (const m of ['BTC', 'GOLD'] as const) {
  const c = await load(MARKETS[m].binance!)
  console.log(`\n=== ${m} ${c.length} bars`)
  for (const id of STRATEGY_IDS) {
    for (const preset of ['zero', 'futures', 'perp'] as CostPresetId[]) {
      const r = runBacktest(c, id, extra[id] ?? {}, { ...withCosts(preset), ...(extra.cfg ?? {}) })
      const a = r.all
      const by = (k: string) => r.trades.filter((t) => t.reason === k).length
      const stopPct = r.trades.length ? (r.trades.reduce((s, t) => s + Math.abs(t.entry - t.stop) / t.entry, 0) / r.trades.length) * 100 : 0
      console.log(
        `${id.padEnd(10)} ${preset.padEnd(8)} n=${String(a.trades).padStart(4)} win=${f(a.winRate * 100, 0)}% expR=${f(a.expectancyR).padStart(6)} totR=${f(a.totalR, 0).padStart(5)} PF=${f(a.profitFactor)} net=${f(a.netPct, 1)}% dd=${f(a.maxDDPct, 1)}% | IS ${f(r.inSample.expectancyR)} OOS ${f(r.outOfSample.expectancyR)} (${r.outOfSample.trades}) | tgt/stop/time ${by('target')}/${by('stop')}/${by('time')} avgStop=${f(stopPct, 3)}% L/S ${a.longs}/${a.shorts}`,
      )
    }
  }
}
