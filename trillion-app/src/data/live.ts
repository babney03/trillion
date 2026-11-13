/** Shared, self-reconnecting Hyperliquid websocket. */
type Handler = (data: any) => void
type Status = 'connecting' | 'live' | 'down'

const URL_WS = 'wss://api.hyperliquid.xyz/ws'
const subs = new Map<string, { sub: Record<string, string>; handlers: Set<Handler> }>()
const statusHandlers = new Set<(s: Status) => void>()
let ws: WebSocket | null = null
let status: Status = 'connecting'
let retry = 0
let pingTimer: ReturnType<typeof setInterval> | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined

const keyOf = (sub: Record<string, string>) => `${sub.type}|${sub.coin ?? ''}|${sub.interval ?? ''}`

function setStatus(s: Status) {
  if (s === status) return
  status = s
  statusHandlers.forEach((h) => h(s))
}

function route(msg: any) {
  const d = msg?.data
  if (!d) return
  let key: string | null = null
  if (msg.channel === 'activeAssetCtx') key = `activeAssetCtx|${d.coin}|`
  else if (msg.channel === 'candle') key = `candle|${d.s}|${d.i}`
  if (key) subs.get(key)?.handlers.forEach((h) => h(d))
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
  clearTimeout(reconnectTimer)
  try {
    ws = new WebSocket(URL_WS)
  } catch {
    schedule()
    return
  }
  ws.onopen = () => {
    retry = 0
    setStatus('live')
    for (const s of subs.values()) ws?.send(JSON.stringify({ method: 'subscribe', subscription: s.sub }))
    clearInterval(pingTimer)
    pingTimer = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('{"method":"ping"}'), 30_000)
  }
  ws.onmessage = (e) => {
    try {
      route(JSON.parse(e.data))
    } catch {
      /* ignore malformed frames */
    }
  }
  ws.onclose = () => {
    clearInterval(pingTimer)
    ws = null
    schedule()
  }
  ws.onerror = () => ws?.close()
}

function schedule() {
  setStatus('down')
  if (!subs.size) return
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(connect, Math.min(15_000, 800 * 2 ** retry++))
}

export function subscribe(sub: Record<string, string>, handler: Handler): () => void {
  const key = keyOf(sub)
  let entry = subs.get(key)
  if (!entry) {
    entry = { sub, handlers: new Set() }
    subs.set(key, entry)
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'subscribe', subscription: sub }))
  }
  entry.handlers.add(handler)
  connect()
  return () => {
    entry!.handlers.delete(handler)
    if (entry!.handlers.size) return
    subs.delete(key)
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'unsubscribe', subscription: sub }))
  }
}

export function onStatus(h: (s: Status) => void): () => void {
  statusHandlers.add(h)
  h(status)
  return () => statusHandlers.delete(h)
}

/** Browsers suspend sockets in background tabs; reconnect as soon as the app is visible again. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && subs.size) connect()
  })
}

export type { Status as LiveStatus }
