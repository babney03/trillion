import { useEffect, useState } from 'react'
import { DEFAULT_PREFS, type AlertPrefs } from '../bot/alerts'
import { Notice } from './bits'

const PIN_KEY = 'trillion.pin'
const PREFS_KEY = 'trillion.alertPrefs'

function b64ToBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0))
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

async function post(body: unknown) {
  const r = await fetch('/api/alerts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (r.status === 401) localStorage.removeItem(PIN_KEY)
  if (!r.ok || j.ok === false) throw new Error(j.reason ?? `Server responded ${r.status}`)
  return j
}

export function AlertsPanel() {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [server, setServer] = useState<{ enabled: boolean; publicKey?: string; reason?: string } | null>(null)
  const [sub, setSub] = useState<PushSubscription | null>(null)
  const [prefs, setPrefs] = useState<AlertPrefs>(() => {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
    } catch {
      return DEFAULT_PREFS
    }
  })
  const [pin, setPin] = useState(() => localStorage.getItem(PIN_KEY) ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then(setServer)
      .catch(() => setServer({ enabled: false, reason: 'The alerts service could not be reached.' }))
    if (supported) navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription().then(setSub)).catch(() => {})
  }, [supported])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMsg(null)
    try {
      setMsg({ text: await fn() })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), bad: true })
    } finally {
      setBusy(false)
    }
  }

  const turnOn = () =>
    run(async () => {
      if (!pin) throw new Error('Enter your PIN first.')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Notifications are blocked for Trillion. Allow them in your phone settings, then try again.')
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
      await navigator.serviceWorker.ready
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(server!.publicKey!) as BufferSource }))
      await post({ action: 'subscribe', subscription: s.toJSON(), prefs, pin, label: isIOS() ? 'iPhone' : navigator.platform })
      localStorage.setItem(PIN_KEY, pin)
      setSub(s)
      return 'Alerts are on for this device. A welcome notification is on its way.'
    })

  const turnOff = () =>
    run(async () => {
      if (sub) {
        await post({ action: 'unsubscribe', endpoint: sub.endpoint, pin }).catch(() => {})
        await sub.unsubscribe()
      }
      setSub(null)
      return 'Alerts are off for this device.'
    })

  const save = (next: AlertPrefs) => {
    setPrefs(next)
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    if (sub) run(async () => (await post({ action: 'prefs', endpoint: sub.endpoint, prefs: next, pin }), 'Saved.'))
  }

  if (!server) return <div className="skeleton" style={{ height: 90 }} />
  return (
    <div className="panel panel-body" style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
      <p className="small muted">
        A notification when your strategy or a trial finds a setup (market, entry, stop, target), and when a paper trade closes. Setups are only sent for the latest bars, never in a flood after an outage.
      </p>
      {!server.enabled ? (
        <Notice>{server.reason ?? 'Alerts are not available.'}</Notice>
      ) : !supported ? (
        <Notice>This browser cannot receive alerts. {isIOS() ? 'On iPhone, add Trillion to your Home Screen (Share, then Add to Home Screen) and open it from there.' : 'Try Chrome, Edge, Firefox or Safari.'}</Notice>
      ) : isIOS() && !standalone() ? (
        <Notice>On iPhone, alerts only work from the Home Screen app. In Safari tap Share, then Add to Home Screen, open Trillion from the new icon, and come back to this tab.</Notice>
      ) : (
        <>
          <div className="cluster">
            <span className={`tag ${sub ? 'ok' : ''}`}>
              <i className={`dot${sub ? ' live' : ''}`} />
              {sub ? 'On for this device' : 'Off for this device'}
            </span>
            {!sub && (
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="PIN"
                aria-label="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            )}
            {sub ? (
              <>
                <button className="btn small" type="button" disabled={busy} onClick={() => run(async () => (await post({ action: 'test', endpoint: sub.endpoint, pin }), 'Test alert sent.'))}>
                  Send a test
                </button>
                <button className="btn ghost small" type="button" disabled={busy} onClick={turnOff}>Turn off</button>
              </>
            ) : (
              <button className="btn primary small" type="button" disabled={busy || !pin} onClick={turnOn}>{busy ? 'Turning on…' : 'Turn on alerts'}</button>
            )}
          </div>
          <fieldset className="alert-prefs">
            <legend className="small muted">Send me</legend>
            {(
              [
                ['mine', 'Setups from your strategy (paper money)'],
                ['trials', 'Setups from the shadow trials'],
                ['closed', 'Paper trades closing, with the result'],
              ] as [keyof AlertPrefs, string][]
            ).map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={prefs[k]} onChange={(e) => save({ ...prefs, [k]: e.target.checked })} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      {msg && (msg.bad ? <Notice bad>{msg.text}</Notice> : <p className="small muted" role="status">{msg.text}</p>)}
    </div>
  )
}
