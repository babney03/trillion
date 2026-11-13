import type { ReactNode } from 'react'
import { IconAlert } from './icons'
import { ago } from './format'

export function Notice({ children, bad = false }: { children: ReactNode; bad?: boolean }) {
  return (
    <div className={`notice${bad ? ' bad' : ''}`} role={bad ? 'alert' : 'status'}>
      <IconAlert size={16} />
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ rows = 4, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  )
}

/** Says when a section is showing an older copy because its last refresh failed. */
export function Stale({ t, why }: { t: number; why?: string }) {
  if (!why) return null
  return <span className="tag warn" title={why}>{t ? `showing copy from ${ago(t)}` : 'unavailable'}</span>
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}
