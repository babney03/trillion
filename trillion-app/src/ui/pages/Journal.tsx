import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cleanTrade,
  dateKey,
  groupBy,
  MARKET_PRESETS,
  monthGrid,
  outcome,
  plannedRR,
  rMultiple,
  SETUP_TAGS,
  summarize,
  type JournalData,
  type JTrade,
} from '../../journal/model'
import { Notice, Seg, Skeleton } from '../bits'
import { fmtPct, fmtR, fmtSigned, tone } from '../format'
import { IconChevron } from '../icons'

const PIN_KEY = 'trillion.pin'
const CACHE_KEY = 'trillion.journal.cache'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

class AuthError extends Error {}

async function call(pin: string, init?: { method: 'POST'; body: unknown }): Promise<JournalData> {
  const r = await fetch('/api/journal', {
    method: init?.method ?? 'GET',
    headers: { 'x-trillion-pin': pin, ...(init ? { 'content-type': 'application/json' } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
  })
  const j = await r.json().catch(() => null)
  if (r.status === 401 || r.status === 403) throw new AuthError(j?.error ?? 'Wrong PIN.')
  if (!r.ok || !j) throw new Error(j?.error ?? `The journal could not be reached (${r.status}).`)
  return (j.data ?? j) as JournalData
}

const money = (x: number) => (Math.abs(x) >= 10_000 ? `${x < 0 ? '−' : '+'}$${(Math.abs(x) / 1000).toFixed(1)}k` : fmtSigned(x, 0))
/** Calendar cells are narrow on a phone: thousands as k. */
const cellMoney = (x: number) => (Math.abs(x) >= 1000 ? `${x < 0 ? '−' : '+'}$${(Math.abs(x) / 1000).toFixed(1)}k` : fmtSigned(x, 0))
const longDate = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

function PinGate({ onPin, error }: { onPin: (p: string) => void; error?: string }) {
  const [v, setV] = useState('')
  return (
    <div className="panel panel-body" style={{ maxWidth: 440, display: 'grid', gap: 12 }}>
      <h2>Unlock your journal</h2>
      <p className="small muted">Your journal is private. Enter the Trillion PIN once on this device; it is remembered here.</p>
      <form className="ask" style={{ maxWidth: 'none' }} onSubmit={(e) => (e.preventDefault(), v && onPin(v))}>
        <input type="password" inputMode="numeric" autoComplete="current-password" placeholder="PIN" aria-label="PIN" value={v} onChange={(e) => setV(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!v}>Unlock</button>
      </form>
      {error && <Notice bad>{error}</Notice>}
    </div>
  )
}

type Draft = Partial<Omit<JTrade, 'entry' | 'stop' | 'target' | 'exit' | 'size' | 'pnl'>> & Record<'entry' | 'stop' | 'target' | 'exit' | 'size' | 'pnl', string>

const toDraft = (t: JTrade | null, date: string): Draft => ({
  ...(t ?? { date, side: 'long', market: '', tags: [] }),
  date: t?.date ?? date,
  tags: t?.tags ?? [],
  entry: t?.entry?.toString() ?? '',
  stop: t?.stop?.toString() ?? '',
  target: t?.target?.toString() ?? '',
  exit: t?.exit?.toString() ?? '',
  size: t?.size?.toString() ?? '',
  pnl: t?.pnl?.toString() ?? '',
})

function TradeForm({ initial, date, onSave, onCancel, onDelete }: { initial: JTrade | null; date: string; onSave: (t: JTrade) => Promise<void>; onCancel: () => void; onDelete?: () => Promise<void> }) {
  const [d, setD] = useState<Draft>(() => toDraft(initial, date))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof Draft, v: unknown) => setD((x) => ({ ...x, [k]: v }))
  const preview = cleanTrade({ ...d, market: d.market || 'X' }, Date.now())
  const r = preview ? rMultiple(preview) : undefined
  const rr = preview ? plannedRR(preview) : undefined
  const submit = async () => {
    const t = cleanTrade(d, Date.now())
    if (!t) return setErr('Add at least the market and side.')
    setBusy(true)
    setErr('')
    try {
      await onSave(t)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }
  const field = (k: keyof Draft, label: string, extra: Record<string, unknown> = {}) => (
    <label className="field">
      {label}
      <input value={(d[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} {...extra} />
    </label>
  )
  const price = { inputMode: 'decimal', autoComplete: 'off' }
  return (
    <form className="panel panel-body jform" onSubmit={(e) => (e.preventDefault(), submit())}>
      <div className="jform-grid">
        <label className="field">
          Market
          <input list="j-markets" value={d.market ?? ''} onChange={(e) => set('market', e.target.value.toUpperCase())} placeholder="XAUUSD" autoCapitalize="characters" required />
          <datalist id="j-markets">{MARKET_PRESETS.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <div className="field">
          Side
          <Seg label="Side" value={d.side ?? 'long'} onChange={(v) => set('side', v)} options={[['long', 'Long'], ['short', 'Short']]} />
        </div>
        {field('date', 'Date', { type: 'date' })}
        {field('time', 'Time', { type: 'time' })}
        {field('entry', 'Entry', price)}
        {field('stop', 'Stop', price)}
        {field('target', 'Target', price)}
        {field('exit', 'Exit', price)}
        {field('size', 'Size (lots)', price)}
        {field('pnl', 'P&L ($)', { inputMode: 'decimal', autoComplete: 'off', placeholder: '-970 or 1552' })}
      </div>
      <div className="field">
        Setup
        <div className="chips" style={{ justifyContent: 'flex-start' }}>
          {SETUP_TAGS.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={d.tags?.includes(t)} onClick={() => set('tags', d.tags?.includes(t) ? d.tags.filter((x) => x !== t) : [...(d.tags ?? []), t])}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="jform-grid">
        {field('levelSwept', 'Level swept', { placeholder: 'e.g. 5,065.85 1h low' })}
        {field('drawTo', 'Drawing to', { placeholder: 'e.g. equal highs 5,192' })}
      </div>
      <label className="field">
        Notes
        <textarea rows={3} value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Why you took it, how you managed it, what you would change" />
      </label>
      <p className="small muted">
        {rr !== undefined ? `Planned ${rr.toFixed(2)} to 1. ` : ''}
        {r !== undefined ? `Result ${fmtR(r)}.` : 'Add entry, stop and exit to get the result in R.'}
      </p>
      {err && <Notice bad>{err}</Notice>}
      <div className="cluster">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add trade'}</button>
        <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        {onDelete && (
          <button className="btn ghost danger" type="button" disabled={busy} onClick={async () => { if (confirm('Delete this trade?')) { setBusy(true); try { await onDelete() } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false) } } }}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function DayNotes({ date, initial, save }: { date: string; initial: string; save: (date: string, notes: string) => Promise<void> }) {
  const [v, setV] = useState(initial)
  const [state, setState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const latest = useRef(v)
  latest.current = v
  useEffect(() => {
    setV(initial)
    setState('saved')
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps
  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    setState('saving')
    try {
      await save(date, latest.current)
      setState('saved')
    } catch {
      setState('error')
    }
  }, [date, save])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div className="field">
      <span className="section-head" style={{ alignItems: 'center' }}>
        <span>Journal</span>
        <span className={`tiny ${state === 'error' ? 'down' : 'faint'}`} aria-live="polite">
          {state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Unsaved' : state === 'error' ? 'Not saved. It will retry when you type.' : 'Saved'}
        </span>
      </span>
      <textarea
        className="jnotes"
        rows={7}
        value={v}
        placeholder="Bias for the day, levels you are watching, news, how you felt, what you learned."
        onChange={(e) => {
          setV(e.target.value)
          setState('dirty')
          clearTimeout(timer.current)
          timer.current = setTimeout(flush, 1200)
        }}
        onBlur={() => state === 'dirty' && flush()}
      />
    </div>
  )
}

function Breakdown({ trades }: { trades: JTrade[] }) {
  const rows = (key: (t: JTrade) => string[]) => {
    const m = new Map<string, JTrade[]>()
    for (const t of trades) for (const k of key(t)) m.set(k, [...(m.get(k) ?? []), t])
    return [...m.entries()].map(([k, ts]) => ({ k, s: summarize(ts) })).sort((a, b) => b.s.trades - a.s.trades)
  }
  const table = (title: string, data: ReturnType<typeof rows>) => (
    <section className="section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th /><th className="r">Trades</th><th className="r">Win rate</th><th className="r">Avg R</th><th className="r">P&amp;L</th></tr></thead>
          <tbody>
            {data.map(({ k, s }) => (
              <tr key={k}>
                <td style={{ fontWeight: 560 }}>{k}</td>
                <td className="num r">{s.trades}</td>
                <td className="num r">{s.wins + s.losses ? `${Math.round(s.winRate * 100)}%` : '—'}</td>
                <td className={`num r ${tone(s.avgR)}`}>{s.avgR === undefined ? '—' : fmtR(s.avgR)}</td>
                <td className={`num r ${tone(s.pnl)}`}>{fmtSigned(s.pnl, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
  if (!trades.length) return null
  return (
    <div className="cols">
      {table('By market', rows((t) => [t.market]))}
      {table('By setup', rows((t) => (t.tags.length ? t.tags : ['No setup tagged'])))}
    </div>
  )
}

export function Journal() {
  const [pin, setPin] = useState(() => localStorage.getItem(PIN_KEY) ?? '')
  const [data, setData] = useState<JournalData | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    } catch {
      return null
    }
  })
  const [error, setError] = useState('')
  const [authError, setAuthError] = useState('')
  const today = dateKey(new Date())
  const [cursor, setCursor] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }))
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<JTrade | 'new' | null>(null)
  const [scope, setScope] = useState<'month' | 'all'>('month')

  const keep = (d: JournalData) => {
    setData(d)
    localStorage.setItem(CACHE_KEY, JSON.stringify(d))
  }
  const handle = (e: unknown) => {
    if (e instanceof AuthError) {
      localStorage.removeItem(PIN_KEY)
      setPin('')
      setAuthError(e.message)
    }
    throw e
  }

  useEffect(() => {
    if (!pin) return
    call(pin)
      .then((d) => {
        keep(d)
        setError('')
        localStorage.setItem(PIN_KEY, pin)
      })
      .catch((e) => {
        if (e instanceof AuthError) {
          localStorage.removeItem(PIN_KEY)
          setPin('')
          setAuthError(e.message)
        } else setError(e instanceof Error ? e.message : String(e))
      })
  }, [pin])

  const post = useCallback(async (body: unknown) => keep(await call(pin, { method: 'POST', body }).catch(handle)), [pin]) // eslint-disable-line react-hooks/exhaustive-deps
  const saveDay = useCallback((date: string, notes: string) => post({ action: 'saveDay', date, notes }), [post])

  const byDay = useMemo(() => groupBy(data?.trades ?? [], (t) => t.date), [data])
  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor])
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const monthTrades = (data?.trades ?? []).filter((t) => t.date.startsWith(monthPrefix))
  const ms = summarize(monthTrades)
  const dayPnl = (k: string) => (byDay.get(k) ?? []).reduce((a, t) => a + (t.pnl ?? 0), 0)
  const monthDays = [...new Set(monthTrades.map((t) => t.date))]
  const best = monthDays.length ? monthDays.reduce((a, b) => (dayPnl(b) > dayPnl(a) ? b : a)) : null
  const worst = monthDays.length ? monthDays.reduce((a, b) => (dayPnl(b) < dayPnl(a) ? b : a)) : null
  const dayTrades = (byDay.get(selected) ?? []).slice().sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const ds = summarize(dayTrades)

  const shift = (n: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + n, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const pick = (k: string) => {
    setSelected(k)
    setEditing(null)
    const d = new Date(`${k}T12:00:00`)
    if (d.getMonth() !== cursor.m || d.getFullYear() !== cursor.y) setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  if (!pin) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>My trades</h1><p>Your own trades and a journal for every day.</p></div></div>
        <PinGate onPin={(p) => (setAuthError(''), setPin(p))} error={authError} />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My trades</h1>
          <p>Your own trades and a journal for every day. Synced to every device you unlock with your PIN.</p>
        </div>
        <button className="btn ghost small" type="button" onClick={() => { localStorage.removeItem(PIN_KEY); localStorage.removeItem(CACHE_KEY); setPin(''); setData(null) }}>Lock on this device</button>
      </div>
      {error && <Notice bad>{error}{data ? ' Showing the copy saved on this device.' : ''}</Notice>}
      {!data ? (
        <Skeleton rows={6} height={60} />
      ) : (
        <>
          <dl className="stats">
            <div className="stat"><dt>P&amp;L this month</dt><dd className={`num ${tone(ms.pnl)}`}>{fmtSigned(ms.pnl, 0)}</dd></div>
            <div className="stat"><dt>Trades</dt><dd className="num">{ms.trades}</dd></div>
            <div className="stat"><dt>Win rate</dt><dd className="num">{ms.wins + ms.losses ? fmtPct(ms.winRate * 100, 0).replace('+', '') : '—'}</dd></div>
            <div className="stat"><dt>Average win / loss</dt><dd className="num pair"><span className={ms.wins ? 'up' : ''}>{ms.wins ? fmtSigned(ms.avgWin, 0) : '—'}</span><span className="faint">/</span><span className={ms.losses ? 'down' : ''}>{ms.losses ? fmtSigned(-ms.avgLoss, 0) : '—'}</span></dd></div>
            <div className="stat"><dt>Average R</dt><dd className={`num ${tone(ms.avgR)}`}>{ms.avgR === undefined ? '—' : fmtR(ms.avgR)}</dd></div>
            <div className="stat"><dt>Best / worst day</dt><dd className="num pair"><span className={tone(best ? dayPnl(best) : 0)}>{best ? money(dayPnl(best)) : '—'}</span><span className="faint">/</span><span className={tone(worst ? dayPnl(worst) : 0)}>{worst ? money(dayPnl(worst)) : '—'}</span></dd></div>
          </dl>

          <div className="journal">
            <section className="section">
              <div className="toolbar">
                <div className="cluster">
                  <button className="btn ghost icon" type="button" onClick={() => shift(-1)} aria-label="Previous month"><span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><IconChevron size={18} /></span></button>
                  <h2 style={{ minWidth: 150, textAlign: 'center' }}>{new Date(cursor.y, cursor.m, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
                  <button className="btn ghost icon" type="button" onClick={() => shift(1)} aria-label="Next month"><IconChevron size={18} /></button>
                </div>
                <button className="chip" type="button" onClick={() => pick(today)}>Today</button>
              </div>
              <div className="cal" role="grid" aria-label="Trading calendar">
                {WEEKDAYS.map((w) => <div key={w} className="cal-head" role="columnheader">{w}</div>)}
                <div className="cal-head cal-week" role="columnheader">Week</div>
                {Array.from({ length: 6 }, (_, w) => {
                  const week = grid.slice(w * 7, w * 7 + 7)
                  const wk = week.reduce((a, d) => a + dayPnl(d.key), 0)
                  const wn = week.reduce((a, d) => a + (byDay.get(d.key)?.length ?? 0), 0)
                  return [
                    ...week.map((d) => {
                      const n = byDay.get(d.key)?.length ?? 0
                      const p = dayPnl(d.key)
                      const note = !!data.days[d.key]?.notes
                      return (
                        <button
                          key={d.key}
                          type="button"
                          role="gridcell"
                          className={`cal-cell${d.inMonth ? '' : ' out'}${d.key === today ? ' today' : ''}${d.key === selected ? ' sel' : ''}${n ? (p > 0 ? ' win' : p < 0 ? ' loss' : '') : ''}`}
                          aria-selected={d.key === selected}
                          aria-label={`${longDate(d.key)}${n ? `, ${n} trade${n > 1 ? 's' : ''}, ${fmtSigned(p, 0)}` : ''}${note ? ', has a journal entry' : ''}`}
                          onClick={() => pick(d.key)}
                        >
                          <span className="cal-day">{d.day}{note && <i className="cal-note" aria-hidden="true" />}</span>
                          {n > 0 && <span className={`cal-pnl num ${tone(p)}`}><span className="wide">{money(p)}</span><span className="narrow">{cellMoney(p)}</span></span>}
                          {n > 0 && <span className="cal-n">{n} trade{n > 1 ? 's' : ''}</span>}
                        </button>
                      )
                    }),
                    <div key={`w${w}`} className="cal-week cal-weektotal" role="gridcell">
                      {wn > 0 && <span className={`num ${tone(wk)}`}>{money(wk)}</span>}
                      {wn > 0 && <span className="cal-n">{wn}</span>}
                    </div>,
                  ]
                })}
              </div>
            </section>

            <section className="section jday" aria-label={`Journal for ${longDate(selected)}`}>
              <div className="section-head">
                <h2>{longDate(selected)}</h2>
                {ds.trades > 0 && <span className={`num ${tone(ds.pnl)}`}>{fmtSigned(ds.pnl, 0)}</span>}
              </div>
              <DayNotes date={selected} initial={data.days[selected]?.notes ?? ''} save={saveDay} />
              <div className="section-head">
                <h3>Trades</h3>
                {editing === null && <button className="btn primary small" type="button" onClick={() => setEditing('new')}>Add trade</button>}
              </div>
              {editing === 'new' && (
                <TradeForm initial={null} date={selected} onCancel={() => setEditing(null)} onSave={async (t) => { await post({ action: 'saveTrade', trade: t }); setEditing(null); if (t.date !== selected) pick(t.date) }} />
              )}
              {dayTrades.length ? (
                <div className="list">
                  {dayTrades.map((t) =>
                    editing !== null && editing !== 'new' && editing.id === t.id ? (
                      <div key={t.id} style={{ padding: 8 }}>
                        <TradeForm
                          initial={t}
                          date={selected}
                          onCancel={() => setEditing(null)}
                          onSave={async (x) => { await post({ action: 'saveTrade', trade: x }); setEditing(null); if (x.date !== selected) pick(x.date) }}
                          onDelete={async () => { await post({ action: 'deleteTrade', id: t.id }); setEditing(null) }}
                        />
                      </div>
                    ) : (
                      <button key={t.id} type="button" className="row jtrade" onClick={() => setEditing(t)} aria-label={`Edit ${t.market} ${t.side}`}>
                        <span className={`tag ${outcome(t) === 'win' ? 'ok' : outcome(t) === 'loss' ? 'bad' : ''}`}>{t.side === 'long' ? 'Long' : 'Short'}</span>
                        <span className="grow" style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 580 }}>{t.market}</span>
                          {t.time && <span className="small faint"> · {t.time}</span>}
                          {(t.tags.length > 0 || t.drawTo) && (
                            <span className="tiny faint" style={{ display: 'block' }}>
                              {t.tags.join(' · ')}
                              {t.drawTo ? `${t.tags.length ? ' · ' : ''}to ${t.drawTo}` : ''}
                            </span>
                          )}
                        </span>
                        {rMultiple(t) !== undefined && <span className={`num small ${tone(rMultiple(t))}`}>{fmtR(rMultiple(t))}</span>}
                        <span className={`num ${tone(t.pnl)}`} style={{ minWidth: 72, textAlign: 'right' }}>{t.pnl === undefined ? 'open' : fmtSigned(t.pnl, 0)}</span>
                      </button>
                    ),
                  )}
                </div>
              ) : (
                editing !== 'new' && <p className="small muted">No trades logged for this day.</p>
              )}
            </section>
          </div>

          <section className="section">
            <div className="section-head">
              <h2>Breakdown</h2>
              <Seg label="Breakdown period" value={scope} onChange={setScope} options={[['month', 'This month'], ['all', 'All time']]} />
            </div>
            {(scope === 'month' ? monthTrades : data.trades).length ? (
              <Breakdown trades={scope === 'month' ? monthTrades : data.trades} />
            ) : (
              <div className="empty panel"><strong>Nothing logged {scope === 'month' ? 'this month' : 'yet'}.</strong>Pick a day on the calendar and add a trade. After 40 or so, this shows which markets and setups actually pay you.</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
