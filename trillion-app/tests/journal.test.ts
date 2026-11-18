import { describe, expect, it } from 'vitest'
import { cleanTrade, monthGrid, outcome, plannedRR, rMultiple, summarize, type JTrade } from '../src/journal/model'

const base = { date: '2026-11-18', market: 'xauusd', side: 'long' }

describe('journal model', () => {
  it('cleans input: numbers from text, upper-case market, rejects missing essentials', () => {
    const t = cleanTrade({ ...base, entry: '5,077.07', stop: '5054.9', pnl: '$1,552.00', tags: ['Sweep', 'Sweep', 7] }, 1)!
    expect(t).toMatchObject({ market: 'XAUUSD', entry: 5077.07, stop: 5054.9, pnl: 1552, tags: ['Sweep'] })
    expect(cleanTrade({ ...base, side: 'up' }, 1)).toBeNull()
    expect(cleanTrade({ ...base, date: '18/11/2026' }, 1)).toBeNull()
    expect(cleanTrade({ ...base, market: '  ' }, 1)).toBeNull()
  })
  it('works out R and planned reward-to-risk for longs and shorts', () => {
    expect(rMultiple({ side: 'long', entry: 100, stop: 98, exit: 105 })).toBeCloseTo(2.5)
    expect(rMultiple({ side: 'short', entry: 4588.72, stop: 4597.44, exit: 4575.4 })).toBeCloseTo((4588.72 - 4575.4) / 8.72)
    expect(rMultiple({ side: 'long', entry: 100, stop: 100, exit: 105 })).toBeUndefined()
    expect(plannedRR({ entry: 67494.51, stop: 66856.49, target: 69664.99 })).toBeCloseTo(3.4, 1)
  })
  it('decides outcome from P&L first, then from R, else open', () => {
    const t = (x: Partial<JTrade>) => cleanTrade({ ...base, ...x }, 1)!
    expect(outcome(t({ pnl: -970 }))).toBe('loss')
    expect(outcome(t({ entry: 100, stop: 99, exit: 101 }))).toBe('win')
    expect(outcome(t({ entry: 100, stop: 99 }))).toBe('open')
  })
  it('summarises the trades from the screenshots', () => {
    const pnls = [1515, 1088, 1212, 1552, -1952, 2640, -1776.52, -970, 3595]
    const s = summarize(pnls.map((pnl) => cleanTrade({ ...base, pnl }, 1)!))
    expect(s).toMatchObject({ trades: 9, wins: 6, losses: 3 })
    expect(s.winRate).toBeCloseTo(2 / 3)
    expect(s.pnl).toBeCloseTo(6903.48)
    expect(s.avgWin).toBeCloseTo(11602 / 6)
  })
  it('lays out a month as six Sunday-first weeks', () => {
    const g = monthGrid(2026, 10) // November 2026 starts on a Sunday
    expect(g).toHaveLength(42)
    expect(g[0]).toEqual({ key: '2026-11-01', day: 1, inMonth: true })
    expect(g.filter((d) => d.inMonth)).toHaveLength(30)
    expect(monthGrid(2026, 1)[0].key).toBe('2026-02-01') // Feb 2026 also starts on a Sunday
    expect(monthGrid(2026, 2)[0].key).toBe('2026-03-01')
    expect(monthGrid(2026, 3)[0].key).toBe('2026-03-29') // April starts on a Wednesday
  })
})
