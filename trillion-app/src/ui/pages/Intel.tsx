import { useMemo, useState } from 'react'
import { Notice, Seg, Skeleton, Stale } from '../bits'
import { useData, useNow, type CalEvent, type Ipo, type NewsItem, type Section } from '../data'
import { ago, clock, dayLabel, until } from '../format'

type View = 'calendar' | 'ipos' | 'markets' | 'crypto' | 'ai' | 'defense'
const VIEWS: [View, string][] = [['calendar', 'Calendar'], ['ipos', 'IPOs'], ['markets', 'Markets'], ['crypto', 'Crypto'], ['ai', 'AI & tech'], ['defense', 'Defense']]

function Calendar({ sec, now }: { sec: Section<CalEvent[]>; now: number }) {
  const [filter, setFilter] = useState<'high' | 'usd' | 'all'>('high')
  const events = (sec.data ?? []).filter((e) => (filter === 'all' ? true : e.currency === 'USD' && (filter === 'usd' || e.impact === 'High')))
  const days = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) {
      const k = dayLabel(e.t)
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return [...m.entries()]
  }, [events])
  const next = events.find((e) => e.t > now)
  return (
    <section className="section">
      <div className="section-head">
        <Seg label="Filter" value={filter} onChange={setFilter} options={[['high', 'US high impact'], ['usd', 'All US'], ['all', 'All currencies']]} />
        <span className="small muted">Times are in your local time zone.</span>
      </div>
      {!days.length && <div className="empty panel"><strong>Nothing matches this filter this week.</strong>Switch to “All US” or “All currencies” to see lower-impact releases.</div>}
      {days.map(([day, list]) => (
        <div className="section" key={day} style={{ gap: 8 }}>
          <h3>{day}</h3>
          <div className="list">
            {list.map((e) => (
              <div className="row" key={e.title + e.t + e.currency} style={{ opacity: e.t < now ? 0.55 : 1 }}>
                <span className="num small muted" style={{ width: 62, flex: 'none' }}>{clock(e.t)}</span>
                <span className="tag" style={{ flex: 'none' }}>{e.currency}</span>
                <span className="grow">
                  {e.title}
                  {(e.forecast || e.previous) && (
                    <span className="tiny faint" style={{ display: 'block' }}>
                      {e.forecast && `forecast ${e.forecast}`}{e.forecast && e.previous && ' · '}{e.previous && `previous ${e.previous}`}
                    </span>
                  )}
                </span>
                {e === next ? <span className="tag warn">{until(e.t, now)}</span> : <span className={`tag ${e.impact === 'High' ? 'bad' : ''}`}>{e.impact}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function Ipos({ sec }: { sec: Section<Ipo[]> }) {
  const [status, setStatus] = useState<'upcoming' | 'priced' | 'filed'>('upcoming')
  const rows = (sec.data ?? []).filter((r) => r.status === status)
  return (
    <section className="section">
      <Seg label="IPO status" value={status} onChange={setStatus} options={[['upcoming', 'Upcoming'], ['priced', 'Recently priced'], ['filed', 'Filed']]} />
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Company</th><th>Symbol</th><th>Exchange</th><th className="r">Price</th><th className="r">Offer size</th><th className="r">Date</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.company + r.date}>
                  <td className="wrap" style={{ fontWeight: 540 }}>{r.company}</td>
                  <td className="num">{r.symbol || '—'}</td>
                  <td className="muted">{r.exchange || '—'}</td>
                  <td className="num r">{r.price ? `$${r.price}` : '—'}</td>
                  <td className="num r">{r.value || '—'}</td>
                  <td className="num r">{r.date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty panel"><strong>No {status === 'priced' ? 'recently priced' : status} IPOs listed.</strong>The Nasdaq calendar for this month and next has none in this group.</div>
      )}
    </section>
  )
}

function News({ sec, now }: { sec: Section<NewsItem[]>; now: number }) {
  const items = sec.data ?? []
  if (!items.length) return <div className="empty panel"><strong>No headlines right now.</strong>The feeds for this section returned nothing; they are retried every few minutes.</div>
  return (
    <div className="list">
      {items.map((n) => (
        <a className="row" key={n.link} href={n.link} target="_blank" rel="noreferrer noopener">
          <span className="grow">
            {n.title}
            <span className="tiny faint" style={{ display: 'block', marginTop: 2 }}>{n.source} · {ago(n.t, now)}</span>
          </span>
        </a>
      ))}
    </div>
  )
}

export function Intel() {
  const { intel } = useData()
  const now = useNow(30_000)
  const [view, setView] = useState<View>('calendar')
  const sec = intel.data?.sections[view] as Section<any> | undefined
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Intel</h1>
          <p>What moves the markets you trade: scheduled data, new listings and the news.</p>
        </div>
        {sec && <Stale t={sec.t} why={sec.stale} />}
      </div>
      <Seg label="Section" value={view} onChange={setView} options={VIEWS} />
      {!intel.data ? (
        intel.error ? <Notice bad>{intel.error}</Notice> : <Skeleton rows={7} />
      ) : !sec || sec.data === null ? (
        <Notice bad>This section could not be loaded{sec?.stale ? ` (${sec.stale})` : ''}. It is retried automatically.</Notice>
      ) : view === 'calendar' ? (
        <Calendar sec={sec} now={now} />
      ) : view === 'ipos' ? (
        <Ipos sec={sec} />
      ) : (
        <News sec={sec} now={now} />
      )}
    </div>
  )
}
