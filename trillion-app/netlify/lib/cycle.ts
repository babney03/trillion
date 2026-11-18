import { getStore } from '@netlify/blobs'
import { ensureTracks, initState, isValidState, logIncident, maybeRetune, runTick, type Deps, type Seed } from '../../src/bot/core'
import seed from '../../src/bot/seed.json'
import { BOT, type BotMarket, type BotState, type JournalEntry, type SourceId } from '../../src/bot/types'
import { binanceCandles, hlCandles, MARKETS } from '../../src/data/candles'

export const store = () => getStore({ name: 'trillion', consistency: 'strong' })
type Store = ReturnType<typeof store>

const STATE = 'bot/state'
const BACKUP = 'bot/state.bak'
const JOURNAL = 'bot/journal'

async function readJson<T>(s: Store, key: string): Promise<T | null> {
  try {
    return (await s.get(key, { type: 'json' })) as T | null
  } catch {
    return null
  }
}

export interface Loaded {
  state: BotState
  journal: JournalEntry[]
  /** The state as it was read, kept as the backup once this cycle saves. */
  good: BotState | null
}

/** Load the bot, repairing itself from the backup or the journal if the state is unreadable. */
export async function loadBot(s: Store, now = Date.now()): Promise<Loaded> {
  const [raw, journalRaw] = await Promise.all([readJson<BotState>(s, STATE), readJson<JournalEntry[]>(s, JOURNAL)])
  const journal = Array.isArray(journalRaw) ? journalRaw : []
  if (isValidState(raw)) {
    const good = structuredClone(raw)
    for (const id of ensureTracks(raw, now, (seed as { tracks: Seed }).tracks)) {
      raw.lessons.push({ t: now, track: id, kind: 'guard', msg: `Added ${id.replace(':', ' ')} as a new strategy track.` })
    }
    return { state: raw, journal, good }
  }

  const backup = await readJson<BotState>(s, BACKUP)
  if (isValidState(backup)) {
    logIncident(backup, now, 'error', 'Saved state was unreadable. Restored the last good copy; any bars since then are replayed.', true)
    return { state: backup, journal, good: null }
  }
  const fresh = initState(now, (seed as { tracks: Seed }).tracks)
  if (raw !== null || journal.length) {
    // No usable state at all: rebuild the account from the trade journal.
    fresh.equity = fresh.startEquity + journal.filter((j) => j.taken).reduce((a, j) => a + j.pnl, 0)
    fresh.day.startEquity = fresh.equity
    fresh.curve = [{ t: now, v: fresh.equity }]
    logIncident(fresh, now, 'error', 'Saved state and its backup were unreadable. Rebuilt paper equity from the trade journal; open positions were dropped.', true)
  }
  return { state: fresh, journal, good: null }
}

export async function saveBot(s: Store, l: Loaded): Promise<void> {
  if (l.good) await s.setJSON(BACKUP, l.good)
  await Promise.all([s.setJSON(STATE, l.state), s.setJSON(JOURNAL, l.journal)])
  l.good = structuredClone(l.state)
}

const liveDeps = (): Deps => {
  const tf = BOT.tfMs
  const from = (bars: number) => Math.floor(Date.now() / tf) * tf - (bars + 1) * tf
  return {
    now: Date.now,
    candles: (market: BotMarket, source: SourceId, bars: number) =>
      source === 'hyperliquid'
        ? hlCandles(MARKETS[market].hl, '5m', from(bars))
        : binanceCandles(MARKETS[market].binance!, '5m', from(bars)),
    history: (market: BotMarket, days: number) => binanceCandles(MARKETS[market].binance!, '5m', Date.now() - days * 86_400_000),
  }
}

/** One full bot cycle against live data and the blob store. */
export async function cycle(opts: { retune?: boolean } = {}) {
  const s = store()
  const started = Date.now()
  const loaded = await loadBot(s, started)
  const deps = liveDeps()
  const res = await runTick(loaded.state, loaded.journal, deps)
  await saveBot(s, loaded)
  // Trading is saved first. The re-tune downloads weeks of history and must never put a cycle at risk.
  if (opts.retune && Date.now() - started < 9_000 && (await maybeRetune(loaded.state, deps))) await saveBot(s, loaded)
  return { ...res, ms: Date.now() - started, equity: loaded.state.equity, loaded }
}
