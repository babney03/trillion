/**
 * Risk profile of the owner strategy over a year of real history, at the bot's costs,
 * for several risk-per-trade settings.
 *   npx tsx scripts/risk.ts <cacheDir>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cfgFor } from '../src/bot/core'
import { BOT, BOT_MARKETS } from '../src/bot/types'
import { binanceCandles, MARKETS, sanitize } from '../src/data/candles'
import { runBacktest } from '../src/engine/backtest'
import type { Candle } from '../src/engine/types'

const cache = process.argv[2]
const now = Math.floor(Date.now() / 86_400_000) * 86_400_000
const f = (n: number, d = 1) => n.toFixed(d)
console.log('bot settings', JSON.stringify({ riskPct: BOT.riskPct, dailyLossPct: BOT.dailyLossPct, lossStreak: BOT.lossStreak, cooldownH: BOT.cooldownMs / 3_600_000, maxOpen: BOT.maxOpen }))
for (const m of BOT_MARKETS) {
  const sym = MARKETS[m].binance!
  const file = join(cache, `${sym}-365d-${now}.json`)
  const c: Candle[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : sanitize(await binanceCandles(sym, '5m', now - 365 * 86_400_000, now), 300_000).candles
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(c))
  for (const risk of [0.005, 0.01, 0.02]) {
    const cfg = { ...cfgFor(m), riskPct: risk }
    const r = runBacktest(c, 'liquidity', {}, cfg)
    const t = r.trades
    let streak = 0, maxStreak = 0
    const days = new Map<number, number>()
    let eq = 10_000
    const eqAt: number[] = []
    for (const x of t) {
      streak = x.r > 0 ? 0 : streak + 1
      if (streak > maxStreak) maxStreak = streak
      const d = Math.floor(x.exitT / 86_400_000)
      days.set(d, (days.get(d) ?? 0) + x.pnl / eq)
      eq += x.pnl
      eqAt.push(eq)
    }
    const worstDay = Math.min(...days.values()) * 100
    const losses = t.filter((x) => x.r <= 0)
    const avgLossR = losses.reduce((a, x) => a + x.r, 0) / losses.length
    const worstR = Math.min(...t.map((x) => x.r))
    const stopPct = t.reduce((a, x) => a + Math.abs(x.entry - x.stop) / x.entry, 0) / t.length * 100
    const lev = t.reduce((a, x) => a + (x.qty * x.entry) / 10_000, 0) / t.length
    const by = (k: string) => t.filter((x) => x.reason === k).length
    const losingMonths = (() => { const mth = new Map<string, number>(); for (const x of t) { const k = new Date(x.exitT).toISOString().slice(0, 7); mth.set(k, (mth.get(k) ?? 0) + x.pnl) } return [...mth.values()].filter((v) => v < 0).length + '/' + mth.size })()
    console.log(`${m} risk ${f(risk * 100, 2)}%: trades ${t.length} win ${f(r.all.winRate * 100, 0)}% expR ${f(r.all.expectancyR, 2)} net ${f(r.all.netPct)}% maxDD ${f(r.all.maxDDPct)}% | longest losing run ${maxStreak} | worst day ${f(worstDay, 2)}% | avg loss ${f(avgLossR, 2)}R worst trade ${f(worstR, 2)}R | avg stop ${f(stopPct, 2)}% avg notional ${f(lev, 2)}x | tgt/stop/time ${by('target')}/${by('stop')}/${by('time')} | losing months ${losingMonths} | MC maxDD p50 ${f(r.monteCarlo!.maxDDPct.p50)}% p95 ${f(r.monteCarlo!.maxDDPct.p95)}% probLoss ${f(r.monteCarlo!.probLoss * 100, 0)}% netP5 ${f(r.monteCarlo!.netPct.p5)}% netP95 ${f(r.monteCarlo!.netPct.p95)}%`)
  }
}
