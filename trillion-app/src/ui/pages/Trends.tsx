import { useState } from 'react'
import { Notice, Seg, Skeleton, Stale } from '../bits'
import { useData, useNow, type Pool } from '../data'
import { ago, fmtAuto, fmtCompact, fmtPct, fmtUsd, shortAddr, tone } from '../format'
import { IconExternal } from '../icons'
import { ageLabel, readTrend } from '../trend'

type PoolView = 'trending' | 'solana' | 'fresh'

const poolLink = (p: Pool) => `https://www.geckoterminal.com/${p.network}/pools/${p.pool}`
const fomoLink = (mint: string) => `https://fomo.family/tokens/solana/${mint}`

function Pools({ pools, now }: { pools: Pool[]; now: number }) {
  const rows = pools.map((p) => ({ p, r: readTrend(p, now) })).sort((a, b) => b.r.score - a.r.score)
  if (!rows.length) return <div className="empty panel"><strong>Nothing clears the bar right now.</strong>New pools are only listed once they are trending and hold at least $20k of liquidity.</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Token</th><th className="r">Score</th><th className="r">Price</th><th className="r">1h</th><th className="r">24h</th>
            <th className="r">Buyers / sellers, 1h</th><th className="r">Volume, 1h</th><th className="r">Liquidity</th><th className="r">Age</th><th>Watch for</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, r }) => (
            <tr key={p.network + p.pool}>
              <td>
                <span style={{ fontWeight: 580 }}>{p.symbol}</span>
                <span className="tiny faint" style={{ display: 'block' }}>{p.name.slice(0, 28)} · {p.network}</span>
              </td>
              <td className="num r" style={{ fontWeight: 600, color: r.score >= 60 ? 'var(--accent-strong)' : undefined }}>{r.score}</td>
              <td className="num r">${fmtAuto(p.price)}</td>
              <td className={`num r ${tone(p.chg.h1)}`}>{fmtPct(p.chg.h1, 1)}</td>
              <td className={`num r ${tone(p.chg.h24)}`}>{fmtPct(p.chg.h24, 1)}</td>
              <td className="num r">{p.tx.h1 ? `${p.tx.h1.buyers} / ${p.tx.h1.sellers}` : '—'}</td>
              <td className="num r">{fmtCompact(p.vol.h1)}</td>
              <td className="num r">{fmtCompact(p.liquidity)}</td>
              <td className="num r">{ageLabel(r.ageH)}</td>
              <td className="small">{r.flags.length ? <span className="down">{r.flags.join(', ')}</span> : <span className="faint">—</span>}</td>
              <td>
                <span style={{ display: 'inline-flex', gap: 12 }}>
                  {p.network === 'solana' && p.token && <a className="small" href={fomoLink(p.token)} target="_blank" rel="noreferrer noopener">fomo</a>}
                  <a className="small" href={poolLink(p)} target="_blank" rel="noreferrer noopener" aria-label={`Open ${p.symbol} chart`}><IconExternal size={15} /></a>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Trends() {
  const { trends } = useData()
  const now = useNow(30_000)
  const [view, setView] = useState<PoolView>('solana')
  const t = trends.data
  const f = t?.fomo
  const sec = t?.sections[view]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Trends</h1>
          <p>What is getting attention on-chain right now, with the risks stated next to it.</p>
        </div>
      </div>
      {!t ? (
        trends.error ? <Notice bad>{trends.error}</Notice> : <Skeleton rows={8} />
      ) : (
        <>
          <section className="section">
            <div className="section-head">
              <h2>On-chain pools</h2>
              <span className="cluster">
                {sec && <Stale t={sec.t} why={sec.stale} />}
                <Seg label="Pools" value={view} onChange={setView} options={[['solana', 'Trending on Solana'], ['trending', 'All chains'], ['fresh', 'Under 3 days old']]} />
              </span>
            </div>
            {sec?.data ? <Pools pools={sec.data} now={now} /> : <Notice bad>Pool data is unavailable{sec?.stale ? ` (${sec.stale})` : ''}.</Notice>}
            <p className="small faint prose">
              Score is a 0–100 read of activity: how many distinct buyers, buy pressure, turnover against liquidity, measured momentum and how new the pool is. It describes attention, not value. Most new tokens go to zero.
            </p>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>fomo wallets</h2>
              {f?.enabled && f.t ? <span className="small faint">updated {ago(f.t, now)}</span> : null}
            </div>
            {!f?.enabled ? (
              <div className="panel panel-body prose" style={{ display: 'grid', gap: 10 }}>
                <p style={{ color: 'var(--text)' }}><strong>The wallet tracker is off until a Bitquery key is added.</strong></p>
                <p>
                  fomo has no public API and its leaderboard is behind login, so Trillion cannot read it. fomo trades on Solana are visible on-chain, though. With a free Bitquery key the tracker records them, ranks wallets by the profit it has seen them realise, and shows what the best ones buy as they buy it.
                </p>
                <p>To switch it on: create a free key at bitquery.io, then in Netlify open this site’s environment variables and add <span className="num">BITQUERY_TOKEN</span>. It starts on the next 15-minute cycle. This part has not been run against live data yet.</p>
              </div>
            ) : (
              <>
                {f.error && <Notice bad>Tracker error on the last cycle: {f.error}</Notice>}
                <p className="small muted">
                  Tracking since {f.since ? new Date(f.since).toLocaleDateString() : '—'}: {f.tracked?.wallets ?? 0} wallets, {f.tracked?.trades ?? 0} trades. Rankings use only profit realised on buys seen since tracking began, so they sharpen over days.
                </p>
                <div className="cols">
                  <section className="section">
                    <h3>What top wallets are buying</h3>
                    {f.leaderBuys?.length ? (
                      <div className="list">
                        {f.leaderBuys.slice(0, 15).map((b) => (
                          <a className="row" key={b.t + b.wallet + b.mint} href={fomoLink(b.mint)} target="_blank" rel="noreferrer noopener">
                            <span className="grow"><span style={{ fontWeight: 580 }}>{b.symbol || shortAddr(b.mint)}</span><span className="tiny faint" style={{ display: 'block' }}>{shortAddr(b.wallet)} · {ago(b.t, now)}</span></span>
                            <span className="num">{fmtUsd(b.usd, 0)}</span>
                          </a>
                        ))}
                      </div>
                    ) : <p className="small muted">No buys from ranked wallets in the last six hours.</p>}
                  </section>
                  <section className="section">
                    <h3>Most bought on fomo, last hour</h3>
                    {f.topTokens?.length ? (
                      <div className="list">
                        {f.topTokens.slice(0, 12).map((x) => (
                          <a className="row" key={x.mint} href={fomoLink(x.mint)} target="_blank" rel="noreferrer noopener">
                            <span className="grow clip"><span style={{ fontWeight: 580 }}>{x.symbol || shortAddr(x.mint)}</span> <span className="small faint">{x.name}</span></span>
                            <span className="num small muted">{x.buyers} buyers</span>
                          </a>
                        ))}
                      </div>
                    ) : <p className="small muted">No data yet.</p>}
                  </section>
                </div>
                {!!f.leaders?.length && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Wallet</th><th className="r">Realised profit, 7d</th><th className="r">Closed</th><th className="r">Win rate</th><th className="r">Volume</th></tr></thead>
                      <tbody>
                        {f.leaders.map((l) => (
                          <tr key={l.wallet}>
                            <td className="num"><a href={`https://solscan.io/account/${l.wallet}`} target="_blank" rel="noreferrer noopener">{shortAddr(l.wallet)}</a></td>
                            <td className="num r up">{fmtUsd(l.pnl, 0)}</td>
                            <td className="num r">{l.closed}</td>
                            <td className="num r">{(l.winRate * 100).toFixed(0)}%</td>
                            <td className="num r">{fmtCompact(l.volume)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Most searched coins</h2>
              {t.sections.coins && <Stale t={t.sections.coins.t} why={t.sections.coins.stale} />}
            </div>
            {t.sections.coins?.data ? (
              <div className="list">
                {t.sections.coins.data.map((c) => (
                  <a className="row" key={c.id} href={`https://www.coingecko.com/en/coins/${c.id}`} target="_blank" rel="noreferrer noopener">
                    {c.thumb && <img src={c.thumb} alt="" width={26} height={26} style={{ borderRadius: '50%', flex: 'none' }} loading="lazy" />}
                    <span className="grow clip"><span style={{ fontWeight: 580 }}>{c.name}</span> <span className="small faint">{c.symbol}{c.rank ? ` · rank ${c.rank}` : ''}</span></span>
                    <span className="num small muted">${fmtAuto(c.price)}</span>
                    <span className={`num ${tone(c.change24h)}`} style={{ minWidth: 72, textAlign: 'right' }}>{fmtPct(c.change24h, 1)}</span>
                  </a>
                ))}
              </div>
            ) : <Notice bad>CoinGecko trending is unavailable right now.</Notice>}
          </section>
        </>
      )}
    </div>
  )
}
