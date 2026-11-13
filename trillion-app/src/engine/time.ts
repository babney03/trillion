const HOUR = 3_600_000
const DAY = 86_400_000
const dstCache = new Map<number, [number, number]>()

function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return 1 + ((7 - first) % 7) + (n - 1) * 7
}

/** US daylight time: second Sunday of March 02:00 EST to first Sunday of November 02:00 EDT. */
function dstRange(year: number): [number, number] {
  let r = dstCache.get(year)
  if (!r) {
    r = [
      Date.UTC(year, 2, nthSunday(year, 2, 2), 7),
      Date.UTC(year, 10, nthSunday(year, 10, 1), 6),
    ]
    dstCache.set(year, r)
  }
  return r
}

export function nyOffsetMs(t: number): number {
  const [a, b] = dstRange(new Date(t).getUTCFullYear())
  return t >= a && t < b ? -4 * HOUR : -5 * HOUR
}

/** Minutes since New York midnight and a day counter in New York local time. */
export function nyClock(t: number): { min: number; day: number } {
  const local = t + nyOffsetMs(t)
  const day = Math.floor(local / DAY)
  return { min: Math.floor((local - day * DAY) / 60_000), day }
}
