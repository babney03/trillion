import { useMemo, useState } from 'react'
import { bucketName, evidence } from '../../bot/learn'
import { MARKETS } from '../../data/candles'
import { BOT_MARKETS } from '../../bot/types'
import { STRATEGIES } from '../../engine/strategies'
import { Notice, Seg, Skeleton } from '../bits'
import { LineChart, type Line } from '../Chart'
import { useData, useNow } from '../data'
import { ago, fmtPct, fmtPx, fmtR, fmtSigned, fmtUsd, stamp, tone } from '../format'
import { IconCheck } from '../icons'

export function Bot() {
  const d = useData()
  const now = useNow(15_000)
  const [filter, setFilter] = useState<'paper' | 'shadow' | 'all'>('paper')
  const [pin, setPin] = useState('')
  const [ctlMsg, setCtlMsg] = useState('')
  const payload = d.bot.data
  const curve = useMemo<Line[]>(() => (payload ? [{ name: 'Paper equity', kind: 'primary', points: payload.state.curve }] : []), [payload])

  if (!payload) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Paper bot</h1></div></div>
        {d.bot.error ? <Notice bad>{d.bot.error} The bot runs on the server; this screen only reads it.</Notice> : <Skeleton rows={6} />}
      </div>
    )
  }

  const { state: s, journal, config } = payload
  const tracks = Object.values(s.tracks)
  const sinceTick = payload.now - s.lastTickAt
  const stalled = s.lastTickAt > 0 && sinceTick > 11 * 60_000
  const status = s.lastTickAt === 0 ? { cls: 'warn', text: 'Starting' } : stalled ? { cls: 'bad', text: 'Stalled' } : s.paused ? { cls: 'warn', text: 'Paused' } : s.day.halted ? { cls: 'warn', text: 'Daily limit reached' } : { cls: 'ok', text: 'Running' }
  const taken = journal.filter((j) => j.taken)
  const wins = taken.filter((j) => j.r > 0).length
  const shown = journal.filter((j) => (filter === 'all' ? true : filter === 'paper' ? j.taken : !j.taken)).slice(0, 120)
  const live = tracks.filter((t) => t.sim.position || t.sim.pending)
  const openIncidents = [...s.incidents].reverse().slice(0, 12)

  const control = async (action: 'pause' | 'resume') => {
    setCtlMsg('')
    try {
      const r = await fetch('/api/bot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, pin }) })
      const j = await r.json()
      setCtlMsg(j.ok ? (action === 'pause' ? 'Paused.' : 'Resumed.') : `Not changed: ${j.reason}.`)
      d.bot.refresh()
    } catch {
      setCtlMsg('Could not reach the server.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Paper bot</h1>
          <p>Scalps gold, bitcoin and oil on 5-minute bars with simulated money. Nothing here is a real order.</p>
        </div>
        <span className="cluster">
          <span className="small faint">{s.lastTickAt ? `last cycle ${ago(s.lastTickAt, now)}` : 'first cycle pending'}</span>
          <span className={`tag ${status.cls}`}><i className={`dot${status.cls === 'ok' ? ' live' : ''}`} />{status.text}</span>
        </span>
      </div>

      {stalled && (
        <Notice bad>
          No cycle for {Math.round(sinceTick / 60_000)} minutes. The app has asked the server to run one now; missed bars are replayed when it does.{' '}
          <button className="chip" type="button" onClick={d.kickBot}>Run a cycle now</button>
        </Notice>
      )}

      <section className="section">
        <dl className="stats">
          <div className="stat"><dt>Paper equity</dt><dd className="num">{fmtUsd(s.equity)}</dd></div>
          <div className="stat"><dt>Since start</dt><dd className={`num ${tone(s.equity - s.startEquity)}`}>{fmtPct((s.equity / s.startEquity - 1) * 100)}</dd></div>
          <div className="stat"><dt>Today (UTC)</dt><dd className={`num ${tone(s.equity - s.day.startEquity)}`}>{fmtSigned(s.equity - s.day.startEquity)}</dd></div>
          <div className="stat"><dt>Paper trades</dt><dd className="num">{taken.length}{taken.length ? <span className="small muted"> · {Math.round((wins / taken.length) * 100)}% won</span> : null}</dd></div>
          <div className="stat"><dt>Shadow trades</dt><dd className="num">{journal.length - taken.length}</dd></div>
          <div className="stat"><dt>Running since</dt><dd className="small" style={{ fontWeight: 500 }}>{stamp(s.createdAt)}</dd></div>
        </dl>
        {s.curve.length > 2 ? <LineChart lines={curve} height={240} /> : <p className="small muted">The equity curve appears once the first paper trade closes. Your strategy averaged about one trade every three days per market in the backtest, so quiet days are normal.</p>}
      </section>

      <section className="section">
        <div className="section-head"><h2>Open now</h2></div>
        {live.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Market</th><th>Strategy</th><th>State</th><th className="r">Entry</th><th className="r">Stop</th><th className="r">Target</th><th className="r">Unrealised</th></tr></thead>
              <tbody>
                {live.map((t) => {
                  const p = t.sim.position
                  const o = p ?? t.sim.pending!
                  const dec = MARKETS[t.market].decimals
                  const px = d.quotes[t.market]?.px
                  const r = p && px ? ((px - p.entry) * (p.side === 'long' ? 1 : -1)) / p.riskPerUnit : null
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 560 }}>{t.market}</td>
                      <td>{STRATEGIES[t.strategy].name}</td>
                      <td>
                        <span className={`tag ${o.taken ? 'ok' : ''}`}>{o.taken ? 'paper' : 'shadow'}</span>{' '}
                        <span className={o.side === 'long' ? 'up' : 'down'}>{o.side}</span> {p ? '' : <span className="muted">resting order</span>}
                        {!o.taken && o.note && <span className="tiny faint" style={{ display: 'block' }}>{o.note}</span>}
                      </td>
                      <td className="num r">{fmtPx(o.entry, dec)}</td>
                      <td className="num r">{fmtPx(o.stop, dec)}</td>
                      <td className="num r">{fmtPx(o.target, dec)}</td>
                      <td className={`num r ${tone(r)}`}>{r === null ? '—' : fmtR(r)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty panel"><strong>Flat. No positions or resting orders.</strong>The bot waits for a liquidity sweep, a break of structure and a fair value gap to line up. Most 5-minute bars offer nothing.</div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Strategy tracks</h2>
          <span className="small muted">Benched tracks keep trading in shadow and return if their results recover.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Market</th><th>Strategy</th><th>Status</th><th className="r">1-year backtest</th><th className="r">Since launch</th><th className="r">Paper P&amp;L</th><th>Contexts switched off</th></tr></thead>
            <tbody>
              {tracks.map((t) => {
                const e = evidence(t.recent)
                const off = Object.keys(t.benchedBuckets)
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 560 }}>{t.market}</td>
                    <td>{STRATEGIES[t.strategy].name}</td>
                    <td className="wrap">
                      <span className={`tag ${t.status === 'active' ? 'ok' : ''}`}>{t.status === 'active' ? 'Active' : 'Benched'}</span>
                      <span className="tiny faint" style={{ display: 'block', marginTop: 3 }}>{t.statusWhy}</span>
                    </td>
                    <td className={`num r ${tone(t.seed.expR)}`}>{t.seed.n ? fmtR(t.seed.expR) : '—'}<span className="tiny faint" style={{ display: 'block' }}>{t.seed.n} trades</span></td>
                    <td className={`num r ${tone(e.n ? e.mean : 0)}`}>{e.n ? fmtR(e.mean) : '—'}<span className="tiny faint" style={{ display: 'block' }}>{t.n} {t.n === 1 ? 'result' : 'results'}</span></td>
                    <td className={`num r ${tone(t.takenPnl)}`}>{t.takenN ? fmtSigned(t.takenPnl) : '—'}</td>
                    <td className="small muted wrap">{off.length ? off.map(bucketName).join(', ') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cols">
        <section className="section">
          <div className="section-head"><h2>What it has learned</h2></div>
          {s.lessons.length ? (
            <div className="list">
              {[...s.lessons].reverse().slice(0, 14).map((l, i) => (
                <div className="row" key={l.t + l.msg + i} style={{ alignItems: 'flex-start' }}>
                  <span className="grow">{l.msg}<span className="tiny faint" style={{ display: 'block', marginTop: 2 }}>{stamp(l.t)}</span></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty panel"><strong>Nothing yet.</strong>It needs at least 12 results in a context, or 15 on a track, before it changes anything. Decisions and the numbers behind them are listed here as they happen.</div>
          )}
        </section>

        <section className="section">
          <div className="section-head"><h2>Health</h2></div>
          <div className="list">
            {BOT_MARKETS.map((m) => {
              const f = s.markets[m]
              if (!f) return null
              const ok = f.failures === 0 && f.lastBarT > 0
              return (
                <div className="row" key={m}>
                  <span className="grow"><span style={{ fontWeight: 560 }}>{m}</span> <span className="small muted">prices from {f.source ?? '—'}</span></span>
                  <span className="small faint">{f.lastBarT ? `last bar ${ago(f.lastBarT + 300_000, now)}` : 'no bars yet'}</span>
                  <span className={`tag ${ok ? 'ok' : 'bad'}`}>{ok ? 'OK' : f.lastBarT ? `${f.failures} failed` : 'Waiting'}</span>
                </div>
              )
            })}
            {openIncidents.map((i, k) => (
              <div className="row" key={i.t + i.msg + k} style={{ alignItems: 'flex-start' }}>
                <span className={i.healed ? 'up' : 'down'} style={{ marginTop: 3 }}>{i.healed ? <IconCheck size={15} /> : <i className="dot" />}</span>
                <span className="grow small">{i.msg}<span className="tiny faint" style={{ display: 'block', marginTop: 2 }}>{stamp(i.t)}{i.healed ? ' · handled automatically' : ' · unresolved'}</span></span>
              </div>
            ))}
          </div>
          {!openIncidents.length && <p className="small muted">No incidents. Data gaps, source switches and recoveries are logged here.</p>}
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Journal</h2>
          <Seg label="Journal filter" value={filter} onChange={setFilter} options={[['paper', 'Paper'], ['shadow', 'Shadow'], ['all', 'All']]} />
        </div>
        {shown.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Closed</th><th>Market</th><th>Strategy</th><th>Side</th><th className="r">Entry</th><th className="r">Exit</th><th className="r">Result</th><th className="r">P&amp;L</th><th>Exit</th><th>Context</th></tr></thead>
              <tbody>
                {shown.map((j) => (
                  <tr key={j.id}>
                    <td className="num small">{stamp(j.exitT + 300_000)}</td>
                    <td style={{ fontWeight: 560 }}>{j.market}</td>
                    <td>{STRATEGIES[j.strategy].name}</td>
                    <td className={j.side === 'long' ? 'up' : 'down'}>{j.side}</td>
                    <td className="num r">{fmtPx(j.entry, MARKETS[j.market].decimals)}</td>
                    <td className="num r">{fmtPx(j.exit, MARKETS[j.market].decimals)}</td>
                    <td className={`num r ${tone(j.r)}`}>{fmtR(j.r)}</td>
                    <td className={`num r ${tone(j.pnl)}`}>{j.taken ? fmtSigned(j.pnl) : <span className="faint">shadow</span>}</td>
                    <td className="small muted">{j.reason === 'time' ? 'time stop' : j.reason}</td>
                    <td className="small muted">{j.ctx ? `${j.ctx.session}, ${j.ctx.vol} vol` : '—'}{!j.taken && j.note ? <span className="tiny faint" style={{ display: 'block' }}>{j.note}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty panel"><strong>No {filter === 'all' ? '' : filter + ' '}trades closed yet.</strong>Every closed trade lands here with its result in R, its exit and the session it was taken in.</div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Assumptions</h2></div>
        <div className="prose small" style={{ display: 'grid', gap: 8 }}>
          <p>Risk per trade is {(config.riskPct * 100).toFixed(1)}% of equity, with a {(config.dailyLossPct * 100).toFixed(0)}% daily loss limit and one position per market.</p>
          <p>Costs: {BOT_MARKETS.map((m) => `${MARKETS[m].name.toLowerCase()} as a ${config.costs[m]?.label.toLowerCase() ?? 'perp'}`).join('; ')}. A trade is skipped when its worst-case costs exceed {Math.round((config.costs.BTC?.maxCostR ?? 0.25) * 100)}% of its risk. If you will trade somewhere dearer, these results flatter it.</p>
          <p>Starting status of each track comes from a {config.seed.days}-day backtest ({config.seed.source}, to {config.seed.asOf}). Fills are simulated from 5-minute bars: if a bar touches both stop and target, the stop is assumed first.</p>
        </div>
        {config.controls && (
          <form className="ask" style={{ maxWidth: 420 }} onSubmit={(e) => (e.preventDefault(), control(s.paused ? 'resume' : 'pause'))}>
            <input type="password" inputMode="numeric" autoComplete="off" placeholder="Control PIN" aria-label="Control PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            <button className="btn" type="submit" disabled={!pin}>{s.paused ? 'Resume bot' : 'Pause bot'}</button>
          </form>
        )}
        {ctlMsg && <p className="small muted" role="status">{ctlMsg}</p>}
      </section>
    </div>
  )
}
