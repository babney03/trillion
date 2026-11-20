import webpush from 'web-push'
import { DEFAULT_PREFS, formatAlert, wanted, type AlertEvent, type AlertPrefs } from '../../src/bot/alerts'
import { store } from './cycle'

export interface Sub {
  endpoint: string
  keys: { p256dh: string; auth: string }
  prefs: AlertPrefs
  createdAt: number
  label?: string
}

const KEY = 'alerts/subs'
type Store = ReturnType<typeof store>

export const vapidReady = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

function configure() {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://trillion-hq.netlify.app', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
}

export async function readSubs(s: Store): Promise<Sub[]> {
  const v = (await s.get(KEY, { type: 'json' }).catch(() => null)) as Sub[] | null
  return Array.isArray(v) ? v : []
}

export async function writeSubs(s: Store, subs: Sub[]) {
  await s.setJSON(KEY, subs.slice(-20))
}

/** Push one payload to one device. Returns false if the device has gone away for good. */
export async function pushTo(sub: Sub, payload: { title: string; body: string; tag: string; url?: string }): Promise<boolean> {
  configure()
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ url: '/#bot', ...payload }), { TTL: 1800, urgency: 'high' })
    return true
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) return false
    console.error('push failed', e?.statusCode, String(e?.body ?? e).slice(0, 200))
    return true
  }
}

/** Send the cycle's alerts to every subscribed device, dropping devices that unsubscribed. */
export async function sendAlerts(events: AlertEvent[]) {
  if (!events.length || !vapidReady()) return
  const s = store()
  const subs = await readSubs(s)
  if (!subs.length) return
  const dead = new Set<string>()
  for (const sub of subs) {
    const prefs = { ...DEFAULT_PREFS, ...sub.prefs }
    for (const e of events.filter((x) => wanted(x, prefs)).slice(0, 6)) {
      if (!(await pushTo(sub, formatAlert(e)))) {
        dead.add(sub.endpoint)
        break
      }
    }
  }
  if (dead.size) await writeSubs(s, subs.filter((x) => !dead.has(x.endpoint)))
}
