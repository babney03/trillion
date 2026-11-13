import { STRATEGIES } from '../engine/strategies'
import type { Trade } from '../engine/types'
import { BOT, type Lesson, type Track } from './types'

export interface Evidence {
  n: number
  mean: number
  se: number
}

export function evidence(rs: number[]): Evidence {
  const n = rs.length
  if (!n) return { n: 0, mean: 0, se: 0 }
  const mean = rs.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  return { n, mean, se: sd / Math.sqrt(n) }
}

/**
 * The single standard of evidence the bot uses everywhere:
 *   negative: enough results and the average is below zero by more than one standard error
 *   positive: enough results and the average is above zero by more than half a standard error
 * Anything else is "unclear" and changes nothing.
 */
export function verdict(rs: number[], minN: number): 'negative' | 'positive' | 'unclear' {
  const e = evidence(rs)
  if (e.n < minN) return 'unclear'
  if (e.mean + e.se < 0) return 'negative'
  if (e.mean - e.se / 2 > 0) return 'positive'
  return 'unclear'
}

const fmt = (e: Evidence) => `last ${e.n} results average ${e.mean >= 0 ? '+' : ''}${e.mean.toFixed(2)}R (±${e.se.toFixed(2)})`
const label = (t: Track) => `${STRATEGIES[t.strategy].name} on ${t.market}`

/** [short name for tables, what the track stops or resumes doing] */
const BUCKETS: Record<string, [string, string]> = {
  'session:asia': ['Asian session', 'trading the Asian session'],
  'session:london': ['London session', 'trading the London session'],
  'session:newyork': ['New York session', 'trading the New York session'],
  'session:late': ['late New York hours', 'trading late New York hours'],
  'vol:low': ['quiet markets', 'trading quiet markets'],
  'vol:normal': ['normal volatility', 'trading in normal volatility'],
  'vol:high': ['high volatility', 'trading in high volatility'],
  'side:long': ['longs', 'taking longs'],
  'side:short': ['shorts', 'taking shorts'],
}

export function bucketsOf(t: Trade): string[] {
  const keys = [`side:${t.side}`]
  if (t.ctx) keys.push(`session:${t.ctx.session}`, `vol:${t.ctx.vol}`)
  return keys
}

export const bucketName = (k: string) => BUCKETS[k]?.[0] ?? k
const bucketVerb = (k: string) => BUCKETS[k]?.[1] ?? `trading ${k}`

/** Record a result (live or shadow) and re-apply the evidence rules. Returns anything the bot learned. */
export function learn(track: Track, trade: Trade, now: number): Lesson[] {
  const out: Lesson[] = []
  track.recent.push(trade.r)
  if (track.recent.length > BOT.recentN) track.recent.shift()
  track.n++
  track.sumR += trade.r
  if (trade.r > 0) track.wins++
  if (trade.taken) {
    track.takenN++
    track.takenPnl += trade.pnl
    track.lossStreak = trade.r > 0 ? 0 : track.lossStreak + 1
    if (track.lossStreak >= BOT.lossStreak) {
      track.cooldownUntil = trade.exitT + BOT.cooldownMs
      track.lossStreak = 0
      out.push({ t: now, track: track.id, kind: 'guard', msg: `${label(track)}: ${BOT.lossStreak} losses in a row. Standing aside for 2 hours.` })
    }
  }

  const v = verdict(track.recent, BOT.trackMinN)
  if (track.status === 'active' && v === 'negative') {
    track.status = 'benched'
    track.statusSince = now
    track.statusWhy = fmt(evidence(track.recent))
    out.push({ t: now, track: track.id, kind: 'bench', msg: `Benched ${label(track)}: ${track.statusWhy}. It keeps trading in shadow and returns if it recovers.` })
  } else if (track.status === 'benched' && v === 'positive') {
    track.status = 'active'
    track.statusSince = now
    track.statusWhy = fmt(evidence(track.recent))
    out.push({ t: now, track: track.id, kind: 'restore', msg: `Restored ${label(track)}: ${track.statusWhy} in shadow. Back on paper equity.` })
  }

  for (const k of bucketsOf(trade)) {
    const b = (track.buckets[k] ??= [])
    b.push(trade.r)
    if (b.length > BOT.bucketN) b.shift()
    const bv = verdict(b, BOT.bucketMinN)
    if (!track.benchedBuckets[k] && bv === 'negative') {
      track.benchedBuckets[k] = { since: now, why: fmt(evidence(b)) }
      out.push({ t: now, track: track.id, kind: 'context-off', msg: `${label(track)} stops ${bucketVerb(k)}: ${fmt(evidence(b))}.` })
    } else if (track.benchedBuckets[k] && bv === 'positive') {
      delete track.benchedBuckets[k]
      out.push({ t: now, track: track.id, kind: 'context-on', msg: `${label(track)} resumes ${bucketVerb(k)}: ${fmt(evidence(b))}.` })
    }
  }
  return out
}
