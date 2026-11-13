export const fmtPx = (x: number | null | undefined, decimals = 2): string =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : x.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

/** Price with sensible precision for anything from BTC to a micro-cap token. */
export function fmtAuto(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  const a = Math.abs(x)
  if (a >= 1000) return fmtPx(x, 0)
  if (a >= 1) return fmtPx(x, 2)
  if (a >= 0.01) return fmtPx(x, 4)
  return x.toPrecision(3)
}

export const fmtPct = (x: number | null | undefined, decimals = 2): string =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(decimals)}%`

export const fmtR = (x: number | null | undefined): string =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(2)}R`

export const fmtUsd = (x: number | null | undefined, decimals = 2): string =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${fmtPx(Math.abs(x), decimals)}`

export const fmtSigned = (x: number, decimals = 2): string => `${x > 0 ? '+' : x < 0 ? '−' : ''}$${fmtPx(Math.abs(x), decimals)}`

export function fmtCompact(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  const a = Math.abs(x)
  if (a >= 1e9) return `$${(x / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `$${(x / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `$${(x / 1e3).toFixed(1)}K`
  return `$${x.toFixed(0)}`
}

export const tone = (x: number | null | undefined) => (x === null || x === undefined || x === 0 ? '' : x > 0 ? 'up' : 'down')

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function until(t: number, now = Date.now()): string {
  const s = Math.round((t - now) / 1000)
  if (s <= 0) return 'now'
  if (s < 3600) return `in ${Math.ceil(s / 60)}m`
  if (s < 86400) return `in ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `in ${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
}

export const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
export const dayLabel = (t: number) => new Date(t).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
export const stamp = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a)
