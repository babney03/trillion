import { useEffect, useMemo, useRef, useState } from 'react'
import { binanceCandles, hlCandles, MARKETS, sanitize, type MarketId } from '../../data/candles'
import type { BacktestResult, WalkForward } from '../../engine/backtest'
import type { Metrics } from '../../engine/metrics'
import { STRATEGIES, STRATEGY_IDS, type StrategyId } from '../../engine/strategies'
import { COST_PRESETS, DEFAULT_CFG, withCosts, type Candle, type CostPresetId, type Params } from '../../engine/types'
import type { WorkerIn } from '../../worker/backtest.worker'
import { Notice } from '../bits'
import { LineChart, type Line } from '../Chart'
import { fmtPct, fmtPx, fmtR, fmtSigned, stamp, tone } from '../format'
import { IconChevron, IconPlay } from '../icons'

type Source = 'binance' | 'hyperliquid'
const PARAM_LABELS: Record<string, string> = {
  rr: 'Target, × risk',
  fvgEntry: 'Entry depth into the gap (0 edge, 0.5 middle)',
  sweepLookback: 'Bars a sweep stays valid',
  stopAtr: 'Stop, × ATR',
  slow: 'Slow EMA',
}
const cache = new Map<string, Candle[]>()
const M5 = 300_000

const pf = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '∞')

function verdict(r: BacktestResult): string {
  const days = Math.round((r.endT - r.startT) / 86_400_000)
  const a = r.all
  if (!a.trades) return `No trades in ${days} days. At these costs every signal was either absent or too expensive relative to its stop.`
  const dir = a.netPct >= 0 ? 'Made' : 'Lost'
  const bh = r.buyHold.netPct
  const oos = r.outOfSample
  const hold = `Buy and hold ${bh >= 0 ? 'made' : 'lost'} ${Math.abs(bh).toFixed(1)}% with a ${r.buyHold.maxDDPct.toFixed(1)}% drawdown.`
  const tail = oos.trades >= 5 ? `On the final 30% of the period, scored on its own, it averaged ${fmtR(oos.expectancyR)} over ${oos.trades} trades.` : 'Too few trades in the final 30% of the period to judge it separately.'
  const sample = a.trades < 30 ? ` With only ${a.trades} trades, this result is mostly noise.` : ''
  return `${dir} ${Math.abs(a.netPct).toFixed(1)}% over ${days} days after costs, averaging ${fmtR(a.expectancyR)} per trade. ${hold} ${tail}${sample}`
}

function Compare({ a, b, labels }: { a: Metrics; b: Metrics; labels: [string, string] }) {
  const rows: [string, (m: Metrics) => string, (m: Metrics) => number][] = [
    ['Trades', (m) => String(m.trades), () => 0],
    ['Win rate', (m) => (m.trades ? `${(m.winRate * 100).toFixed(0)}%` : '—'), () => 0],
    ['Average per trade', (m) => (m.trades ? fmtR(m.expectancyR) : '—'), (m) => m.expectancyR],
    ['Profit factor', (m) => (m.trades ? pf(m.profitFactor) : '—'), () => 0],
    ['Net return', (m) => fmtPct(m.netPct, 1), (m) => m.netPct],
    ['Max drawdown', (m) => `${m.maxDDPct.toFixed(1)}%`, () => 0],
  ]
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th /><th className="r">{labels[0]}</th><th className="r">{labels[1]}</th></tr></thead>
        <tbody>
          {rows.map(([name, f, t]) => (
            <tr key={name}><td className="muted">{name}</td><td className={`num r ${tone(t(a))}`}>{f(a)}</td><td className={`num r ${tone(t(b))}`}>{f(b)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Backtest() {
  const [market, setMarket] = useState<MarketId>('GOLD')
  const [source, setSource] = useState<Source>('binance')
  const [days, setDays] = useState(180)
  const [strategy, setStrategy] = useState<StrategyId>('liquidity')
  const [costs, setCosts] = useState<CostPresetId>('futures')
  const [risk, setRisk] = useState(0.5)
  const [params, setParams] = useState<Params>({})
  const [phase, setPhase] = useState<{ kind: 'idle' | 'loading' | 'running' | 'walking'; pct: number; note?: string }>({ kind: 'idle', pct: 0 })
  const [error, setError] = useState('')
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [walk, setWalk] = useState<WalkForward | null>(null)
  const [ran, setRan] = useState<{ candles: Candle[]; label: string } | null>(null)
  const worker = useRef<Worker | null>(null)
  const job = useRef(0)

  const def = STRATEGIES[strategy]
  const hasDeep = !!MARKETS[market].binance
  const src: Source = hasDeep ? source : 'hyperliquid'
  const cfg = useMemo(() => ({ ...withCosts(costs, DEFAULT_CFG), riskPct: risk / 100 }), [costs, risk])
  const busy = phase.kind !== 'idle'

  useEffect(() => {
    setCosts(market === 'BTC' ? 'perp' : 'futures')
  }, [market])
  useEffect(() => setParams({}), [strategy])
  useEffect(() => () => worker.current?.terminate(), [])

  const post = (msg: WorkerIn) => {
    worker.current ??= new Worker(new URL('../../worker/backtest.worker.ts', import.meta.url), { type: 'module' })
    const w = worker.current
    w.onmessage = (e) => {
      const m = e.data
      if (m.id !== job.current) return
      if (m.kind === 'progress') setPhase({ kind: 'walking', pct: m.done / m.total, note: `Window ${m.done} of ${m.total}` })
      else if (m.kind === 'error') {
        setError(m.message)
        setPhase({ kind: 'idle', pct: 0 })
      } else {
        if (m.kind === 'result') setResult(m.result)
        else setWalk(m.result)
        setPhase({ kind: 'idle', pct: 0 })
      }
    }
    w.onerror = (e) => {
      setError(e.message || 'The backtest worker crashed.')
      setPhase({ kind: 'idle', pct: 0 })
    }
    w.postMessage(msg)
  }

  const load = async (): Promise<{ candles: Candle[]; label: string }> => {
    const m = MARKETS[market]
    const key = `${src}:${market}:${days}`
    const label = src === 'binance' ? `${m.binance}${m.binanceNote ? ` (${m.binanceNote})` : ''}, ${days} days, Binance` : `${m.hl}, about 17 days, Hyperliquid`
    let c = cache.get(key)
    if (!c) {
      const end = Math.floor(Date.now() / M5) * M5
      const raw = src === 'binance'
        ? await binanceCandles(m.binance!, '5m', end - days * 86_400_000, end, (f) => setPhase({ kind: 'loading', pct: f, note: 'Downloading 5-minute history' }))
        : await hlCandles(m.hl, '5m', end - 18 * 86_400_000, end)
      c = sanitize(raw, M5).candles
      if (c.length < def.warmup + 500) throw new Error(`Only ${c.length} bars came back; this strategy needs at least ${def.warmup + 500}.`)
      cache.set(key, c)
    }
    return { candles: c, label }
  }

  const run = async () => {
    setError('')
    setWalk(null)
    setPhase({ kind: 'loading', pct: 0, note: 'Downloading 5-minute history' })
    try {
      const data = await load()
      setRan(data)
      setPhase({ kind: 'running', pct: 1, note: `Simulating ${data.candles.length.toLocaleString()} bars` })
      post({ id: ++job.current, kind: 'run', candles: data.candles, strategy, params, cfg })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase({ kind: 'idle', pct: 0 })
    }
  }

  const runWalk = () => {
    if (!ran) return
    const usable = ran.candles.length - def.warmup
    const testBars = Math.max(1440, Math.floor(usable / 8))
    const trainBars = testBars * 3
    if (usable < trainBars + testBars) {
      setError('Walk-forward needs a longer period. Choose at least 90 days of deep history.')
      return
    }
    setError('')
    setPhase({ kind: 'walking', pct: 0, note: 'Tuning on each window, scoring on the next' })
    post({ id: ++job.current, kind: 'walk', candles: ran.candles, strategy, cfg, trainBars, testBars })
  }

  const lines = useMemo<Line[]>(
    () => (result ? [{ name: def.name, kind: 'primary', points: result.equity }, { name: 'Buy and hold', kind: 'baseline', points: result.buyHold.curve }] : []),
    [result, def.name],
  )
  const dec = MARKETS[market].decimals

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Backtest</h1>
          <p>Run a strategy over real 5-minute history with costs, against simply buying and holding.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-body" style={{ display: 'grid', gap: 16 }}>
          <div className="form-grid">
            <label className="field">Market
              <select value={market} onChange={(e) => setMarket(e.target.value as MarketId)}>
                {(['GOLD', 'BTC', 'SP500', 'NAS100'] as MarketId[]).map((id) => <option key={id} value={id}>{MARKETS[id].name}</option>)}
              </select>
            </label>
            <label className="field">Strategy
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)}>
                {STRATEGY_IDS.map((id) => <option key={id} value={id}>{STRATEGIES[id].name}</option>)}
              </select>
            </label>
            <label className="field">History
              <select value={src === 'hyperliquid' ? 'hl' : String(days)} onChange={(e) => (e.target.value === 'hl' ? setSource('hyperliquid') : (setSource('binance'), setDays(Number(e.target.value))))}>
                {hasDeep && [30, 90, 180, 365, 730].map((n) => <option key={n} value={n}>{n >= 365 ? `${n / 365} year${n > 365 ? 's' : ''}` : `${n} days`}</option>)}
                <option value="hl">Last 17 days (the live contract)</option>
              </select>
            </label>
            <label className="field">Costs
              <select value={costs} onChange={(e) => setCosts(e.target.value as CostPresetId)}>
                {(Object.keys(COST_PRESETS) as CostPresetId[]).map((k) => <option key={k} value={k}>{COST_PRESETS[k].label}</option>)}
              </select>
            </label>
            <label className="field">Risk per trade
              <select value={risk} onChange={(e) => setRisk(Number(e.target.value))}>
                {[0.25, 0.5, 1, 2].map((r) => <option key={r} value={r}>{r}% of equity</option>)}
              </select>
            </label>
            <button className="btn primary" type="button" onClick={run} disabled={busy}><IconPlay size={16} />{busy ? 'Working…' : 'Run backtest'}</button>
          </div>
          <p className="small muted prose">{def.blurb}{!hasDeep && ' Only about 17 days of history exist for this contract, which is too short to trust; treat it as a smoke test.'}{market === 'GOLD' && src === 'binance' && ' Deep gold history uses PAXG, a gold-backed token that tracks spot gold and trades 24/7.'}</p>
          <details className="more">
            <summary><IconChevron size={14} />Strategy settings</summary>
            <div className="form-grid" style={{ marginTop: 12 }}>
              {Object.keys(def.grid).map((k) => (
                <label className="field" key={k}>{PARAM_LABELS[k] ?? k}
                  <input type="number" step="any" inputMode="decimal" value={params[k] ?? def.defaults[k]} onChange={(e) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }))} />
                </label>
              ))}
            </div>
            <p className="small faint prose" style={{ marginTop: 10 }}>Changing settings until the result looks good is how backtests lie. If you tune here, run the walk-forward check below before believing it.</p>
          </details>
          {busy && (
            <div style={{ display: 'grid', gap: 6 }} role="status">
              <span className="small muted">{phase.note}</span>
              <div className="progress"><i style={{ transform: `scaleX(${Math.max(0.02, phase.pct).toFixed(3)})` }} /></div>
            </div>
          )}
          {error && <Notice bad>{error}</Notice>}
        </div>
      </section>

      {!result && !busy && !error && (
        <div className="empty panel"><strong>No run yet.</strong>Pick a market and strategy and press Run. A year of 5-minute bars is about 105,000 candles and takes a few seconds to download.</div>
      )}

      {result && ran && (
        <>
          <section className="section">
            <div className="section-head"><h2>{STRATEGIES[result.strategy].name}</h2><span className="small faint">{ran.label}</span></div>
            <p className="prose" style={{ color: 'var(--text)' }}>{verdict(result)}</p>
            <dl className="stats">
              <div className="stat"><dt>Net return</dt><dd className={`num ${tone(result.all.netPct)}`}>{fmtPct(result.all.netPct, 1)}</dd></div>
              <div className="stat"><dt>Buy and hold</dt><dd className={`num ${tone(result.buyHold.netPct)}`}>{fmtPct(result.buyHold.netPct, 1)}</dd></div>
              <div className="stat"><dt>Max drawdown</dt><dd className="num">{result.all.maxDDPct.toFixed(1)}%</dd></div>
              <div className="stat"><dt>Trades</dt><dd className="num">{result.all.trades}<span className="small muted"> · {result.all.longs}L {result.all.shorts}S</span></dd></div>
              <div className="stat"><dt>Win rate</dt><dd className="num">{result.all.trades ? `${(result.all.winRate * 100).toFixed(0)}%` : '—'}</dd></div>
              <div className="stat"><dt>Average per trade</dt><dd className={`num ${tone(result.all.expectancyR)}`}>{result.all.trades ? fmtR(result.all.expectancyR) : '—'}</dd></div>
              <div className="stat"><dt>Profit factor</dt><dd className="num">{result.all.trades ? pf(result.all.profitFactor) : '—'}</dd></div>
              <div className="stat"><dt>Sharpe</dt><dd className="num">{result.all.sharpe.toFixed(2)}</dd></div>
            </dl>
            <LineChart lines={lines} height={320} />
          </section>

          <div className="cols">
            <section className="section">
              <div className="section-head"><h2>Does it hold on unseen bars?</h2></div>
              <Compare a={result.inSample} b={result.outOfSample} labels={['First 70%', 'Last 30%']} />
              <p className="small faint prose">The split is at {stamp(result.splitT)}. A strategy that only works in the first column was fitted to it.</p>
            </section>
            <section className="section">
              <div className="section-head"><h2>How much was luck?</h2></div>
              {result.monteCarlo ? (
                <>
                  <dl className="stats">
                    <div className="stat"><dt>Unlucky (5th pct)</dt><dd className={`num ${tone(result.monteCarlo.netPct.p5)}`}>{fmtPct(result.monteCarlo.netPct.p5, 1)}</dd></div>
                    <div className="stat"><dt>Typical</dt><dd className={`num ${tone(result.monteCarlo.netPct.p50)}`}>{fmtPct(result.monteCarlo.netPct.p50, 1)}</dd></div>
                    <div className="stat"><dt>Lucky (95th pct)</dt><dd className={`num ${tone(result.monteCarlo.netPct.p95)}`}>{fmtPct(result.monteCarlo.netPct.p95, 1)}</dd></div>
                    <div className="stat"><dt>Chance of a loss</dt><dd className="num">{(result.monteCarlo.probLoss * 100).toFixed(0)}%</dd></div>
                  </dl>
                  <p className="small faint prose">The same trades redrawn at random {result.monteCarlo.runs.toLocaleString()} times. Typical worst drawdown: {result.monteCarlo.maxDDPct.p50.toFixed(1)}%; in a bad run, {result.monteCarlo.maxDDPct.p95.toFixed(1)}%.</p>
                </>
              ) : <p className="small muted">Fewer than five trades, so there is nothing to resample.</p>}
            </section>
          </div>

          <section className="section">
            <div className="section-head">
              <h2>Walk-forward check</h2>
              <button className="btn" type="button" onClick={runWalk} disabled={busy}>{walk ? 'Run again' : 'Run walk-forward'}</button>
            </div>
            {walk ? (
              <>
                <p className="prose" style={{ color: 'var(--text)' }}>
                  Tuned on each window ({walk.combos} setting combinations), then scored on the window after it: {walk.oos.trades} unseen trades averaging {fmtR(walk.oos.expectancyR)}, {fmtR(walk.oos.totalR)} in total.
                  {walk.oos.trades < 20 ? ' That is too few trades to conclude much.' : walk.oos.expectancyR > 0 ? walk.efficiency >= 0.5 ? ' It kept at least half of its tuned performance, which is a healthy sign.' : ' It kept less than half of its tuned performance, a sign of overfitting.' : ' Tuning did not produce an edge on unseen bars.'}
                </p>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Scored on</th><th>Settings chosen</th><th className="r">Tuned result</th><th className="r">Unseen result</th><th className="r">Unseen trades</th></tr></thead>
                    <tbody>
                      {walk.windows.map((w) => (
                        <tr key={w.testFromT}>
                          <td className="num small">{new Date(w.testFromT).toLocaleDateString([], { month: 'short', day: 'numeric' })} – {new Date(w.testToT).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                          <td className="num small muted">{Object.keys(def.grid).map((k) => `${k} ${w.params[k]}`).join(' · ')}</td>
                          <td className={`num r ${tone(w.trainExpR)}`}>{w.trainTrades ? fmtR(w.trainExpR) : '—'}</td>
                          <td className={`num r ${tone(w.testExpR)}`}>{w.testTrades ? fmtR(w.testExpR) : '—'}</td>
                          <td className="num r">{w.testTrades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="small muted prose">Tunes the strategy on one stretch of history, scores it on the next stretch it has never seen, and repeats across the whole period. This is the closest a backtest gets to honest.</p>}
          </section>

          <section className="section">
            <div className="section-head"><h2>Trades</h2><span className="small faint">latest {Math.min(100, result.trades.length)} of {result.trades.length}</span></div>
            {result.trades.length ? (
              <div className="table-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>Entered</th><th>Side</th><th className="r">Entry</th><th className="r">Exit</th><th className="r">Result</th><th className="r">P&amp;L</th><th>Exit</th><th>Setup</th><th>Context</th></tr></thead>
                  <tbody>
                    {[...result.trades].reverse().slice(0, 100).map((t) => (
                      <tr key={t.entryT + t.side}>
                        <td className="num small">{stamp(t.entryT)}</td>
                        <td className={t.side === 'long' ? 'up' : 'down'}>{t.side}</td>
                        <td className="num r">{fmtPx(t.entry, dec)}</td>
                        <td className="num r">{fmtPx(t.exit, dec)}</td>
                        <td className={`num r ${tone(t.r)}`}>{fmtR(t.r)}</td>
                        <td className={`num r ${tone(t.pnl)}`}>{fmtSigned(t.pnl)}</td>
                        <td className="small muted">{t.reason === 'time' ? 'time stop' : t.reason === 'end' ? 'still open' : t.reason}</td>
                        <td className="small muted">{t.setup}</td>
                        <td className="small muted">{t.ctx ? `${t.ctx.session}, ${t.ctx.vol} vol` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="small muted">No trades to list.</p>}
          </section>
        </>
      )}
    </div>
  )
}
