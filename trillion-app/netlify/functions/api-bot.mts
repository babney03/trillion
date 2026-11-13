import type { Config } from '@netlify/functions'
import { cfgFor } from '../../src/bot/core'
import seed from '../../src/bot/seed.json'
import { BOT, BOT_COSTS, BOT_MARKETS } from '../../src/bot/types'
import { COST_PRESETS } from '../../src/engine/types'
import { cycle, loadBot, saveBot, store } from '../lib/cycle'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const publicConfig = () => ({
  ...BOT,
  costs: Object.fromEntries(BOT_MARKETS.map((m) => [m, { preset: BOT_COSTS[m], label: COST_PRESETS[BOT_COSTS[m]].label, maxCostR: cfgFor(m).maxCostR }])),
  seed: { asOf: seed.asOf, days: seed.days, source: seed.source },
  controls: !!process.env.TRILLION_PIN,
})

export default async (req: Request) => {
  try {
    const s = store()
    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { action?: string; pin?: string }
      if (body.action === 'kick') {
        // Self-heal from the client side: if the scheduler has missed cycles, any open app can restart the clock.
        const l = await loadBot(s)
        if (Date.now() - l.state.lastTickAt < 4 * 60_000) return json({ ok: false, reason: 'cycle ran recently' })
        const r = await cycle()
        return json({ ok: true, bars: r.bars, trades: r.trades, ms: r.ms })
      }
      const pin = process.env.TRILLION_PIN
      if (!pin || body.pin !== pin) return json({ ok: false, reason: pin ? 'wrong PIN' : 'controls are not enabled' }, 403)
      const l = await loadBot(s)
      if (body.action === 'pause' || body.action === 'resume') {
        l.state.paused = body.action === 'pause'
        l.state.lessons.push({ t: Date.now(), kind: 'guard', msg: l.state.paused ? 'Paused by you. Signals continue in shadow.' : 'Resumed by you.' })
        await saveBot(s, l)
        return json({ ok: true, paused: l.state.paused })
      }
      return json({ ok: false, reason: 'unknown action' }, 400)
    }
    const l = await loadBot(s)
    return json({ now: Date.now(), state: l.state, journal: l.journal.slice(-400).reverse(), config: publicConfig() })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

export const config: Config = { path: '/api/bot' }
