import { describe, expect, it } from 'vitest'
import { initState } from '../src/bot/core'
import { answer, type Snapshot } from '../src/ui/assistant'

const now = Date.UTC(2026, 10, 13, 12)
const state = initState(now)
state.equity = 10_130
state.lastTickAt = now - 120_000
const snap: Snapshot = {
  now,
  quotes: { GOLD: { px: 3920.7, prev: 3984.4, chg: -1.6, volume: 1e8, funding: 0, t: now }, BTC: { px: 68918, prev: 73772, chg: -6.58, volume: 4e9, funding: 0, t: now } },
  bot: { now, state, journal: [], config: {} as never },
  intel: {
    now,
    sections: {
      calendar: { t: now, data: [
        { title: 'Old event', currency: 'USD', t: now - 3_600_000, impact: 'High', forecast: '', previous: '' },
        { title: 'Core CPI m/m', currency: 'USD', t: now + 45 * 60_000, impact: 'High', forecast: '0.3%', previous: '0.2%' },
        { title: 'ECB speech', currency: 'EUR', t: now + 10 * 60_000, impact: 'High', forecast: '', previous: '' },
      ] },
      ipos: { t: now, data: [{ symbol: 'ACME', company: 'Acme Robotics', exchange: 'NASDAQ', price: '18', shares: '', value: '', date: '11/20/2026', status: 'upcoming' }] },
    },
  },
  trends: null,
  movers: [{ coin: 'xyz:NVDA', name: 'NVDA', group: 'stocks', px: 200, chg: 7.2, volume: 5e8 }],
}

describe('assistant', () => {
  it('reads a price with the right precision and direction', () => {
    const r = answer("What's the price of gold?", snap)
    expect(r.text).toBe('Gold is at 3,920.7, down 1.60 percent on the day.')
    expect(r.market).toBe('GOLD')
  })
  it('says so when it has no live price', () => {
    expect(answer('how is the nasdaq', snap).text).toMatch(/no live price for Nasdaq 100/)
  })
  it('reports the bot from its real state', () => {
    const r = answer('how is the bot doing', snap)
    expect(r.text).toContain('10,130.00 dollars')
    expect(r.text).toContain('up 1.30 percent overall')
    expect(r.text).toContain('no open positions')
    expect(r.go).toBe('bot')
  })
  it('warns when the bot has stalled', () => {
    const stalled = { ...snap, bot: { ...snap.bot!, state: { ...state, lastTickAt: now - 40 * 60_000 } } }
    expect(answer('bot status', stalled).text).toMatch(/last cycle was 40 minutes ago/)
  })
  it('finds the next high-impact US event and skips past and non-US ones', () => {
    expect(answer('when is the next news event', snap).text).toBe('Next high-impact US event: Core CPI m/m, in 45 minutes, forecast 0.3%.')
  })
  it('navigates and lists', () => {
    expect(answer('open the backtest tab', snap)).toEqual({ text: 'Opening backtest.', go: 'backtest' })
    expect(answer('any upcoming ipos', snap).text).toContain('Acme Robotics on 11/20/2026')
    expect(answer('top movers', snap).text).toContain('NVDA up 7.20 percent')
    expect(answer('trending coins', snap).text).toMatch(/no trending data/)
  })
  it('admits when it does not understand', () => {
    expect(answer('sing me a song', snap).text).toMatch(/don't have an answer/)
  })
})
