import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { MarketId } from './data/candles'
import type { TabId } from './ui/assistant'
import { DataProvider, useData } from './ui/data'
import { fmtPct, fmtUsd, tone } from './ui/format'
import { IconBacktest, IconBot, IconCommand, IconIntel, IconMarkets, IconTrends, Mark } from './ui/icons'
import { Backtest } from './ui/pages/Backtest'
import { Bot } from './ui/pages/Bot'
import { Command } from './ui/pages/Command'
import { Intel } from './ui/pages/Intel'
import { Markets } from './ui/pages/Markets'
import { Trends } from './ui/pages/Trends'

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'command', label: 'Command', icon: <IconCommand /> },
  { id: 'markets', label: 'Markets', icon: <IconMarkets /> },
  { id: 'intel', label: 'Intel', icon: <IconIntel /> },
  { id: 'trends', label: 'Trends', icon: <IconTrends /> },
  { id: 'bot', label: 'Bot', icon: <IconBot /> },
  { id: 'backtest', label: 'Backtest', icon: <IconBacktest /> },
]
const isTab = (x: string): x is TabId => TABS.some((t) => t.id === x)

function BotPill() {
  const { bot } = useData()
  const s = bot.data?.state
  if (!s) return <span className="tag">{bot.error ? 'Bot unreachable' : 'Bot…'}</span>
  const stalled = s.lastTickAt > 0 && bot.data!.now - s.lastTickAt > 11 * 60_000
  return (
    <span className={`tag ${stalled ? 'bad' : 'ok'}`}>
      <i className={`dot${stalled ? '' : ' live'}`} />
      <span className="num">{fmtUsd(s.equity, 0)}</span>
      <span className={`num ${tone(s.equity - s.startEquity)}`}>{fmtPct((s.equity / s.startEquity - 1) * 100, 1)}</span>
    </span>
  )
}

function Shell() {
  const [tab, setTab] = useState<TabId>(() => {
    const h = location.hash.slice(1)
    return isTab(h) ? h : 'command'
  })
  const [market, setMarket] = useState<MarketId>('GOLD')

  const go = useCallback((t: TabId, m?: MarketId) => {
    if (m) setMarket(m)
    setTab(t)
    history.replaceState(null, '', `#${t}`)
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1)
      if (isTab(h)) setTab(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="shell">
      <nav className="rail" aria-label="Trillion programs">
        <div className="brand"><Mark />TRILLION</div>
        {TABS.map((t) => (
          <button key={t.id} type="button" className="nav-btn" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
        <div className="rail-foot">
          <BotPill />
          <p className="tiny faint" style={{ marginTop: 10 }}>Paper trading only. Not financial advice.</p>
        </div>
      </nav>
      <div>
        <header className="topbar">
          <div className="brand"><Mark size={20} />TRILLION</div>
          <BotPill />
        </header>
        <main className="main">
          {tab === 'command' && <Command go={go} />}
          {tab === 'markets' && <Markets market={market} setMarket={setMarket} />}
          {tab === 'intel' && <Intel />}
          {tab === 'trends' && <Trends />}
          {tab === 'bot' && <Bot />}
          {tab === 'backtest' && <Backtest />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}
