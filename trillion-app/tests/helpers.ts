import type { Candle } from '../src/engine/types'

export const M5 = 300_000
export const T0 = Date.UTC(2026, 0, 5) // a Monday, 00:00 UTC

/** Build bars from [o,h,l,c] rows, 5 minutes apart. */
export function bars(rows: number[][], t0 = T0, tf = M5): Candle[] {
  return rows.map(([o, h, l, c], i) => ({ t: t0 + i * tf, o, h, l, c, v: 100 }))
}

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random walk with volatility clustering and occasional impulsive bars, so gaps and sweeps occur. */
export function randomWalk(n: number, seed = 1, start = 100): Candle[] {
  const r = rng(seed)
  const out: Candle[] = []
  let px = start
  let vol = 0.001
  for (let i = 0; i < n; i++) {
    vol = Math.max(0.0004, Math.min(0.004, vol * (0.9 + r() * 0.2)))
    const impulse = r() < 0.06 ? 4 : 1
    const o = px
    const c = o * (1 + (r() - 0.5) * 2 * vol * impulse)
    const h = Math.max(o, c) * (1 + r() * vol * 0.6)
    const l = Math.min(o, c) * (1 - r() * vol * 0.6)
    out.push({ t: T0 + i * M5, o, h, l, c, v: 50 + r() * 100 })
    px = c
  }
  return out
}
