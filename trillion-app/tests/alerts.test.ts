import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, formatAlert, wanted, type AlertEvent } from '../src/bot/alerts'
import { initState, runTick, type Deps } from '../src/bot/core'
import type { BotMarket } from '../src/bot/types'
import type { Candle } from '../src/engine/types'
import { M5, randomWalk, T0 } from './helpers'

const setup: AlertEvent = { kind: 'setup', t: T0, track: 'GOLD:liquidity', market: 'GOLD', strategy: 'liquidity', side: 'long', taken: true, type: 'limit', entry: 3900.5, stop: 3895.5, target: 3913 }

describe('alerts', () => {
  it('formats a setup with entry, stop, target and reward-to-risk', () => {
    expect(formatAlert(setup)).toMatchObject({
      title: 'Setup: Long Gold',
      body: 'Trillion Liquidity. Entry limit at 3,900.5, stop 3,895.5, target 3,913.0 (2.5R).',
    })
    expect(formatAlert({ ...setup, strategy: 'pbopen', taken: false, type: 'market', track: 'GOLD:pbopen' }).body).toContain('Trial only, no paper money.')
  })
  it('formats a closed paper trade', () => {
    const f = formatAlert({ ...setup, kind: 'closed', exit: 3913, r: 2.43, pnl: 243.1, reason: 'target' })
    expect(f.title).toBe('Win: Gold long +2.43R')
    expect(f.body).toBe('Trillion Liquidity. Exit 3,913.0 (target). Paper P&L +$243.10.')
  })
  it('respects preferences and never alerts for background strategies', () => {
    expect(wanted(setup, DEFAULT_PREFS)).toBe(true)
    expect(wanted(setup, { ...DEFAULT_PREFS, mine: false })).toBe(false)
    expect(wanted({ ...setup, strategy: 'pb' }, { ...DEFAULT_PREFS, trials: false })).toBe(false)
    expect(wanted({ ...setup, strategy: 'ict' }, DEFAULT_PREFS)).toBe(false)
    expect(wanted({ ...setup, kind: 'closed', taken: false }, DEFAULT_PREFS)).toBe(false) // shadow results do not ping
  })
  it('the bot raises events only for fresh bars, so catching up never floods the phone', async () => {
    const N = 4200
    const series: Record<BotMarket, Candle[]> = { BTC: randomWalk(N, 11, 60_000), GOLD: randomWalk(N, 23, 3_900), OIL: randomWalk(N, 37, 80) }
    let now = T0 + 1800 * M5 + 1000
    const deps: Deps = { now: () => now, candles: async (m) => series[m].filter((b) => b.t + M5 <= now) }
    const state = initState(now)
    await runTick(state, [], deps)
    now += 2000 * M5 // a long outage: every missed bar is replayed
    const caught = await runTick(state, [], deps)
    expect(caught.bars).toBeGreaterThan(1900)
    expect(caught.events.every((e) => e.t >= now - 20 * 60_000)).toBe(true)
    let fired = 0
    for (let k = 0; k < 400; k++) {
      now += M5
      fired += (await runTick(state, [], deps)).events.length
    }
    expect(fired).toBeGreaterThan(0) // steady running does raise events
  })
})
