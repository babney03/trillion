import type { Config } from '@netlify/functions'
import { cleanTrade, isDate, type JDay, type JournalData, type JTrade } from '../../src/journal/model'
import { store } from '../lib/cycle'

const KEY = 'journal/v1'
const BACKUP = 'journal/v1.bak'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/** Your own trading journal. Every request needs the Trillion PIN, so it stays private even on a public site. */
export default async (req: Request) => {
  const pin = process.env.TRILLION_PIN
  if (!pin) return json({ error: 'The journal is locked until a TRILLION_PIN is set on the site.' }, 403)
  if (req.headers.get('x-trillion-pin') !== pin) return json({ error: 'Wrong PIN.' }, 401)

  const s = store()
  const raw = (await s.get(KEY, { type: 'json' }).catch(() => null)) as JournalData | null
  const data: JournalData = raw && Array.isArray(raw.trades) && raw.days ? raw : { trades: [], days: {} }
  if (req.method === 'GET') return json(data)
  if (req.method !== 'POST') return json({ error: 'Use GET or POST.' }, 405)

  const body = (await req.json().catch(() => null)) as any
  const now = Date.now()
  let saved: JTrade | JDay | null = null
  switch (body?.action) {
    case 'saveTrade': {
      const t = cleanTrade(body.trade, now)
      if (!t) return json({ error: 'That trade is missing its date, market or side.' }, 400)
      const i = data.trades.findIndex((x) => x.id === t.id)
      if (i >= 0) data.trades[i] = { ...t, createdAt: data.trades[i].createdAt }
      else if (data.trades.length >= 5000) return json({ error: 'The journal is full (5,000 trades).' }, 400)
      else data.trades.push(t)
      saved = i >= 0 ? data.trades[i] : t
      break
    }
    case 'deleteTrade': {
      const before = data.trades.length
      data.trades = data.trades.filter((x) => x.id !== body.id)
      if (data.trades.length === before) return json({ error: 'No trade with that id.' }, 404)
      break
    }
    case 'saveDay': {
      if (!isDate(body.date) || typeof body.notes !== 'string') return json({ error: 'A day needs a date and notes.' }, 400)
      const notes = body.notes.slice(0, 20_000)
      if (notes.trim()) data.days[body.date] = saved = { notes, updatedAt: now }
      else delete data.days[body.date]
      break
    }
    default:
      return json({ error: 'Unknown action.' }, 400)
  }
  if (raw) await s.setJSON(BACKUP, raw)
  await s.setJSON(KEY, data)
  return json({ ok: true, saved, data })
}

export const config: Config = { path: '/api/journal' }
