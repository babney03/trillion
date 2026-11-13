import { useEffect, useMemo, useState } from 'react'
import { hlCandles, MARKET_IDS, MARKETS, sanitize, TF_MS, type MarketId } from '../../data/candles'
import { subscribe } from '../../data/live'
import type { Candle } from '../../engine/types'
import { Notice, Seg, Skeleton } from '../bits'
import { CandleChart, type PriceLine } from '../Chart'
import { useData, type Mover } from '../data'
import { fmtAuto, fmtCompact, fmtPct, fmtPx, tone } from '../format'

const TFS: [string, string][] = [['5m', '5m'], ['15m', '15m'], ['1h', '1h'], ['4h', '4h'], ['1d', '1D']]

function MoverList({ title, items }: { title: string; items: Mover[] }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {items.length ? (
        <div className="list">
          {items.map((m) => (
            <div className="row" key={m.coin}>
              <span className="grow clip" style={{ fontWeight: 560 }}>{m.name}</span>
              <span className="num small muted">{fmtAuto(m.px)}</span>
              <span className={`num ${tone(m.chg)}`} style={{ minWidth: 76, textAlign: 'right' }}>{fmtPct(m.chg)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted">Nothing above the volume floor right now.</p>
      )}
    </section>
  )
}

export function Markets({ market, setMarket }: { market: MarketId; setMarket: (m: MarketId) => void }) {
  const d = useData()
  const [tf, setTf] = useState('5m')
  const [candles, setCandles] = useState<Candle[] | null>(null)
  const [live, setLive] = useState<Candle | null>(null)
  const [error, setError] = useState('')
  const [group, setGroup] = useState<'stocks' | 'crypto'>('stocks')
  const m = MARKETS[market]
  const q = d.quotes[market]

  useEffect(() => {
    let dead = false
    setCandles(null)
    setLive(null)
    setError('')
    const load = () =>
      hlCandles(m.hl, tf, Date.now() - 600 * TF_MS[tf])
        .then((raw) => {
          // Keep the forming bar here: a chart should show it, unlike the bot.
          if (!dead) setCandles(sanitize(raw, TF_MS[tf], Date.now() + TF_MS[tf]).candles)
        })
        .catch((e) => !dead && setError(e instanceof Error ? e.message : String(e)))
    load()
    const off = subscribe({ type: 'candle', coin: m.hl, interval: tf }, (b) => {
      if (!dead) setLive({ t: b.t, o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +b.v })
    })
    const again = setInterval(load, 5 * 60_000) // heals any bars missed while the socket was down
    return () => {
      dead = true
      off()
      clearInterval(again)
    }
  }, [m.hl, tf])

  const lines = useMemo<PriceLine[]>(() => {
    const tracks = Object.values(d.bot.data?.state.tracks ?? {}).filter((t) => t.market === market && t.sim.position?.taken)
    return tracks.flatMap((t) => {
      const p = t.sim.position!
      return [
        { price: p.entry, label: `bot ${p.side}`, kind: 'entry' as const },
        { price: p.stop, label: 'stop', kind: 'stop' as const },
        { price: p.target, label: 'target', kind: 'target' as const },
      ]
    })
  }, [d.bot.data, market])

  const movers = (d.movers.data ?? []).filter((x) => x.group === group)
  const gainers = [...movers].filter((x) => x.chg > 0).sort((a, b) => b.chg - a.chg).slice(0, 7)
  const losers = [...movers].filter((x) => x.chg < 0).sort((a, b) => a.chg - b.chg).slice(0, 7)

  return (
    <div className="page">
      <div className="toolbar">
        <Seg label="Market" value={market} onChange={setMarket} options={MARKET_IDS.map((id) => [id, MARKETS[id].name])} />
        <Seg label="Timeframe" value={tf} onChange={setTf} options={TFS} />
      </div>

      <section className="section">
        <div className="ticker">
          <h1 style={{ marginRight: 4 }}>{m.name}</h1>
          <span className="num last">{q ? fmtPx(q.px, m.decimals) : '—'}</span>
          <span className={`num ${tone(q?.chg)}`} style={{ fontSize: '1.0625rem' }}>{q ? fmtPct(q.chg) : ''}</span>
          <span className={`tag ${d.live === 'live' ? 'ok' : 'warn'}`}>
            <i className={`dot${d.live === 'live' ? ' live' : ''}`} />
            {d.live === 'live' ? 'Live' : 'Reconnecting'}
          </span>
        </div>
        {error ? (
          <Notice bad>Could not load the chart: {error}. It retries on its own.</Notice>
        ) : candles ? (
          <CandleChart candles={candles} live={live} decimals={m.decimals} lines={lines} />
        ) : (
          <div className="skeleton" style={{ height: 420, borderRadius: 14 }} />
        )}
        <dl className="stats">
          <div className="stat"><dt>Previous day</dt><dd className="num">{q ? fmtPx(q.prev, m.decimals) : '—'}</dd></div>
          <div className="stat"><dt>24h volume</dt><dd className="num">{q ? fmtCompact(q.volume) : '—'}</dd></div>
          <div className="stat"><dt>Funding, hourly</dt><dd className="num">{q ? `${(q.funding * 100).toFixed(4)}%` : '—'}</dd></div>
          <div className="stat"><dt>Source</dt><dd className="small" style={{ fontWeight: 500 }}>Hyperliquid {m.hl}</dd></div>
        </dl>
        {market !== 'BTC' && (
          <p className="small faint prose">
            This is a perpetual contract that tracks {m.name.toLowerCase()} around the clock. It follows the underlying closely but is not the official exchange print, and it keeps trading when the cash market is closed.
          </p>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Big moves today</h2>
          <Seg label="Group" value={group} onChange={setGroup} options={[['stocks', 'Stocks & commodities'], ['crypto', 'Crypto']]} />
        </div>
        {d.movers.data ? (
          <div className="split">
            <MoverList title="Gainers" items={gainers} />
            <MoverList title="Losers" items={losers} />
          </div>
        ) : d.movers.error ? (
          <Notice bad>Could not load movers: {d.movers.error}</Notice>
        ) : (
          <Skeleton rows={5} />
        )}
      </section>
    </div>
  )
}
