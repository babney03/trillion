export interface NewsItem {
  title: string
  link: string
  t: number
  source: string
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

export function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ' '
      }
      return ENT[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? ''

/** Small RSS 2.0 / Atom reader: enough for headlines, links and dates. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const atom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml)
  const blocks = xml.split(atom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1)
  const out: NewsItem[] = []
  for (const b of blocks) {
    let title = clean(tag(b, 'title'))
    let link = atom ? (b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? '') : clean(tag(b, 'link'))
    const t = Date.parse(clean(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')))
    let src = source
    if (source === 'Google News') {
      // Google News titles end with " - Publisher".
      const cut = title.lastIndexOf(' - ')
      if (cut > 20) {
        src = title.slice(cut + 3)
        title = title.slice(0, cut)
      }
    }
    link = link.replace(/&amp;/g, '&')
    if (title && /^https?:\/\//.test(link) && Number.isFinite(t)) out.push({ title, link, t, source: src })
  }
  return out
}

const UA = 'Mozilla/5.0 (compatible; TrillionDashboard/1.0)'

export async function fetchText(url: string, headers: Record<string, string> = {}, timeoutMs = 7000): Promise<string> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*', ...headers }, signal: ctl.signal, redirect: 'follow' })
    if (!r.ok) throw new Error(`${new URL(url).host} responded ${r.status}`)
    return await r.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJson<T = any>(url: string, headers: Record<string, string> = {}, timeoutMs = 7000): Promise<T> {
  return JSON.parse(await fetchText(url, { accept: 'application/json', ...headers }, timeoutMs)) as T
}

/** Merge feeds newest first, dropping repeats of the same headline. */
export async function newsFrom(feeds: [string, string][], limit = 30): Promise<{ items: NewsItem[]; failed: string[] }> {
  const failed: string[] = []
  const lists = await Promise.all(
    feeds.map(async ([source, url]) => {
      try {
        return parseFeed(await fetchText(url), source)
      } catch {
        failed.push(source)
        return []
      }
    }),
  )
  const seen = new Set<string>()
  const items = lists
    .flat()
    .filter((i) => i.t <= Date.now() + 3_600_000)
    .sort((a, b) => b.t - a.t)
    .filter((i) => {
      const k = i.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  if (!items.length) throw new Error(`no headlines (${failed.join(', ') || 'feeds were empty'})`)
  return { items: items.slice(0, limit), failed }
}

export interface Section<T> {
  t: number
  data: T
  /** Set when the latest refresh failed and this is an older copy. */
  stale?: string
}

/**
 * Refresh each section independently. A section that fails keeps its last
 * good copy and says so, instead of taking the whole response down.
 */
export async function refreshSections(
  prev: Record<string, Section<unknown>> | null,
  loaders: Record<string, () => Promise<unknown>>,
  only?: string[],
): Promise<Record<string, Section<unknown>>> {
  const out: Record<string, Section<unknown>> = { ...(prev ?? {}) }
  await Promise.all(
    Object.entries(loaders)
      .filter(([k]) => !only || only.includes(k))
      .map(async ([k, load]) => {
        try {
          out[k] = { t: Date.now(), data: await load() }
        } catch (e) {
          const why = e instanceof Error ? e.message : String(e)
          if (out[k]) out[k] = { ...out[k], stale: why }
          else out[k] = { t: 0, data: null, stale: why }
        }
      }),
  )
  return out
}
