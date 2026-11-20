import type { Config } from '@netlify/functions'
import { DEFAULT_PREFS, type AlertPrefs } from '../../src/bot/alerts'
import { store } from '../lib/cycle'
import { pushTo, readSubs, vapidReady, writeSubs, type Sub } from '../lib/push'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const cleanPrefs = (p: any): AlertPrefs => ({
  mine: p?.mine !== false,
  trials: p?.trials !== false,
  closed: p?.closed !== false,
})

/** Phone alerts: register a device, change what it receives, send a test, or remove it. PIN required to change anything. */
export default async (req: Request) => {
  if (!vapidReady()) return json({ enabled: false, reason: 'Alerts are not configured on the server yet.' })
  if (req.method === 'GET') return json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY })
  const body = (await req.json().catch(() => null)) as any
  const pin = process.env.TRILLION_PIN
  if (!pin || body?.pin !== pin) return json({ ok: false, reason: pin ? 'Wrong PIN.' : 'Set a TRILLION_PIN on the site first.' }, 401)
  const s = store()
  const subs = await readSubs(s)
  const endpoint = typeof body?.subscription?.endpoint === 'string' ? body.subscription.endpoint : typeof body?.endpoint === 'string' ? body.endpoint : ''
  if (!/^https:\/\/[\w.-]+\//.test(endpoint)) return json({ ok: false, reason: 'Missing device subscription.' }, 400)
  const existing = subs.find((x) => x.endpoint === endpoint)
  switch (body.action) {
    case 'subscribe': {
      const keys = body.subscription?.keys
      if (typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') return json({ ok: false, reason: 'Incomplete subscription.' }, 400)
      const sub: Sub = { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, prefs: cleanPrefs(body.prefs ?? DEFAULT_PREFS), createdAt: existing?.createdAt ?? Date.now(), label: String(body.label ?? '').slice(0, 60) || undefined }
      await writeSubs(s, [...subs.filter((x) => x.endpoint !== endpoint), sub])
      const ok = await pushTo(sub, { title: 'Trillion alerts are on', body: 'You will get a notification when a setup appears or a paper trade closes.', tag: 'welcome' })
      return json({ ok, prefs: sub.prefs })
    }
    case 'prefs': {
      if (!existing) return json({ ok: false, reason: 'This device is not registered. Turn alerts on again.' }, 404)
      existing.prefs = cleanPrefs(body.prefs)
      await writeSubs(s, subs)
      return json({ ok: true, prefs: existing.prefs })
    }
    case 'test': {
      if (!existing) return json({ ok: false, reason: 'This device is not registered. Turn alerts on again.' }, 404)
      const ok = await pushTo(existing, { title: 'Shadow setup: Long Gold', body: 'Test alert. This is what a setup notification looks like: entry, stop, target and the strategy that found it.', tag: 'test' })
      if (!ok) await writeSubs(s, subs.filter((x) => x.endpoint !== endpoint))
      return json({ ok, reason: ok ? undefined : 'The device rejected the alert. Turn alerts on again.' })
    }
    case 'unsubscribe':
      await writeSubs(s, subs.filter((x) => x.endpoint !== endpoint))
      return json({ ok: true })
    default:
      return json({ ok: false, reason: 'Unknown action.' }, 400)
  }
}

export const config: Config = { path: '/api/alerts' }
