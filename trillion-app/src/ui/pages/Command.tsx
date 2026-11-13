import { useCallback, useEffect, useRef, useState } from 'react'
import { MARKET_IDS, MARKETS, type MarketId } from '../../data/candles'
import { answer, type TabId } from '../assistant'
import { Notice } from '../bits'
import { useData, useNow } from '../data'
import { ago, fmtPct, fmtPx, fmtSigned, fmtUsd, tone, until, clock } from '../format'
import { IconMic, IconSend } from '../icons'
import { Orb, type OrbState } from '../Orb'
import { canListen, canSpeak, listen, speak } from '../voice'

const PROMPTS = ['Market brief', 'How is the bot doing?', 'Next news event', 'What did the bot learn?', 'Trending coins', 'Top movers']

export function Command({ go }: { go: (tab: TabId, market?: MarketId) => void }) {
  const d = useData()
  const now = useNow(15_000)
  const [orb, setOrb] = useState<OrbState>('idle')
  const [heard, setHeard] = useState('')
  const [reply, setReply] = useState('')
  const [typed, setTyped] = useState('')
  const [micError, setMicError] = useState('')
  const stop = useRef<() => void>(() => {})
  const snap = useRef(d)
  snap.current = d

  const respond = useCallback(
    (text: string) => {
      setHeard(text)
      const s = snap.current
      const r = answer(text, { quotes: s.quotes, bot: s.bot.data, intel: s.intel.data, trends: s.trends.data, movers: s.movers.data, now: Date.now() })
      setReply(r.text)
      setOrb('speaking')
      stop.current = speak(r.text, () => {
        setOrb('idle')
        if (r.go && r.go !== 'command') go(r.go)
        else if (r.market) go('markets', r.market)
      })
      if (!canSpeak) setOrb('idle')
    },
    [go],
  )

  const talk = () => {
    stop.current()
    if (orb === 'listening' || orb === 'speaking') {
      setOrb('idle')
      return
    }
    if (!canListen) {
      setMicError('This browser has no speech recognition. Type your question below instead; Chrome and Safari support voice.')
      return
    }
    setMicError('')
    setHeard('')
    setReply('')
    setOrb('listening')
    let got = false
    stop.current = listen({
      interim: setHeard,
      final: (text) => {
        if (!text) return
        got = true
        respond(text)
      },
      error: (why) => {
        if (why === 'not-allowed' || why === 'service-not-allowed') setMicError('Microphone access is blocked. Allow it in your browser settings, or type your question.')
        else if (why !== 'no-speech' && why !== 'aborted') setMicError(`Speech recognition stopped (${why}). Try again or type your question.`)
      },
      end: () => !got && setOrb('idle'),
    })
  }

  useEffect(() => () => stop.current(), [])

  const bot = d.bot.data?.state
  const events = (d.intel.data?.sections.calendar?.data ?? []).filter((e) => e.t > now && e.currency === 'USD' && e.impact === 'High').slice(0, 3)
  const headlines = (['markets', 'crypto', 'ai', 'defense'] as const)
    .flatMap((k) => (d.intel.data?.sections[k]?.data ?? []).slice(0, 2))
    .sort((a, b) => b.t - a.t)
    .slice(0, 5)
  const openPos = bot ? Object.values(bot.tracks).filter((t) => t.sim.position?.taken) : []
  const status = orb === 'listening' ? 'Listening…' : orb === 'speaking' ? 'Tap to stop' : 'Tap the orb and ask'

  return (
    <div className="page">
      <div className="command">
        <section className="orb-stage" aria-label="Voice assistant">
          <button type="button" className="orb-btn" onClick={talk} aria-label={orb === 'listening' ? 'Stop listening' : 'Talk to Trillion'}>
            <Orb state={orb} />
          </button>
          <div className="say" aria-live="polite">
            {heard && <span className="heard">“{heard}”</span>}
            {reply || <span className="muted">{status}</span>}
          </div>
          {micError && <Notice>{micError}</Notice>}
          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault()
              if (!typed.trim()) return
              stop.current()
              respond(typed.trim())
              setTyped('')
            }}
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Ask Trillion" aria-label="Ask Trillion" enterKeyHint="send" />
            <button className="btn" type="button" onClick={talk} aria-label="Speak">
              <IconMic size={18} />
            </button>
            <button className="btn primary" type="submit" aria-label="Send">
              <IconSend size={18} />
            </button>
          </form>
          <div className="chips">
            {PROMPTS.map((p) => (
              <button key={p} type="button" className="chip" onClick={() => (stop.current(), respond(p))}>
                {p}
              </button>
            ))}
          </div>
        </section>

        <div className="section" style={{ gap: 24 }}>
          <section className="section">
            <div className="section-head">
              <h2>Markets</h2>
              <span className={`tag ${d.live === 'live' ? 'ok' : 'warn'}`}>
                <i className={`dot${d.live === 'live' ? ' live' : ''}`} />
                {d.live === 'live' ? 'Live' : 'Reconnecting'}
              </span>
            </div>
            <div className="list">
              {MARKET_IDS.map((id) => {
                const q = d.quotes[id]
                return (
                  <button key={id} type="button" className="quote" onClick={() => go('markets', id)}>
                    <span>{MARKETS[id].name}</span>
                    <span className="num px">{q ? fmtPx(q.px, MARKETS[id].decimals) : '—'}</span>
                    <span className="tiny faint">{id === 'BTC' ? 'Perpetual' : 'Tracks the underlying, 24/7'}</span>
                    <span className={`num small ${tone(q?.chg)}`}>{q ? fmtPct(q.chg) : ''}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Paper bot</h2>
              {bot && <span className="small faint">{bot.lastTickAt ? `cycle ${ago(bot.lastTickAt, now)}` : 'waiting for first cycle'}</span>}
            </div>
            {d.bot.error && !bot ? (
              <Notice bad>{d.bot.error}</Notice>
            ) : !bot ? (
              <div className="skeleton" style={{ height: 76 }} />
            ) : (
              <button type="button" className="list" style={{ padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => go('bot')}>
                <span className="row">
                  <span className="grow">
                    <span className="num" style={{ fontSize: '1.25rem', fontWeight: 560 }}>{fmtUsd(bot.equity)}</span>
                    <span className={`num small ${tone(bot.equity - bot.startEquity)}`} style={{ marginLeft: 10 }}>{fmtPct((bot.equity / bot.startEquity - 1) * 100)}</span>
                  </span>
                  <span className="small muted">
                    today <span className={`num ${tone(bot.equity - bot.day.startEquity)}`}>{fmtSigned(bot.equity - bot.day.startEquity)}</span>
                  </span>
                </span>
                <span className="row small muted">
                  {openPos.length ? openPos.map((t) => `${t.sim.position!.side} ${t.market}`).join(', ') : 'No open positions'}
                  {bot.paused ? ' · paused' : bot.day.halted ? ' · daily loss limit reached' : ''}
                </span>
              </button>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Next high-impact US events</h2>
            </div>
            {events.length ? (
              <div className="list">
                {events.map((e) => (
                  <div className="row" key={e.title + e.t}>
                    <span className="grow clip">{e.title}</span>
                    <span className="small muted num">{clock(e.t)}</span>
                    <span className="tag warn">{until(e.t, now)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">{d.intel.data ? 'Nothing high-impact left on the US calendar this week.' : d.intel.error ?? 'Loading the calendar…'}</p>
            )}
          </section>

          {headlines.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>Latest headlines</h2>
                <button className="chip" type="button" onClick={() => go('intel')}>All intel</button>
              </div>
              <div className="list">
                {headlines.map((h) => (
                  <a className="row" key={h.link} href={h.link} target="_blank" rel="noreferrer noopener">
                    <span className="grow">
                      {h.title}
                      <span className="tiny faint" style={{ display: 'block' }}>{h.source} · {ago(h.t, now)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
