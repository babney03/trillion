import type { Config } from '@netlify/functions'
import { store } from '../lib/cycle'
import { fetchJson, refreshSections, type Section } from '../lib/feeds'

const GT = 'https://api.geckoterminal.com/api/v2'
const num = (x: unknown) => (x === null || x === undefined || x === '' ? null : Number(x))

function pools(res: any) {
  const tokens = new Map<string, any>((res.included ?? []).filter((x: any) => x.type === 'token').map((x: any) => [x.id, x.attributes]))
  return (res.data ?? []).map((p: any) => {
    const a = p.attributes
    const tok = tokens.get(p.relationships?.base_token?.data?.id) ?? {}
    return {
      network: p.relationships?.network?.data?.id ?? String(p.id).split('_')[0],
      dex: p.relationships?.dex?.data?.id ?? '',
      pool: a.address,
      name: tok.name ?? String(a.name).split(' / ')[0],
      symbol: tok.symbol ?? String(a.name).split(' / ')[0],
      token: tok.address ?? '',
      image: typeof tok.image_url === 'string' && tok.image_url.startsWith('https://') ? tok.image_url : null,
      price: num(a.base_token_price_usd),
      fdv: num(a.fdv_usd),
      liquidity: num(a.reserve_in_usd),
      createdAt: Date.parse(a.pool_created_at) || null,
      chg: { m5: num(a.price_change_percentage?.m5), h1: num(a.price_change_percentage?.h1), h6: num(a.price_change_percentage?.h6), h24: num(a.price_change_percentage?.h24) },
      vol: { h1: num(a.volume_usd?.h1), h6: num(a.volume_usd?.h6), h24: num(a.volume_usd?.h24) },
      tx: { h1: a.transactions?.h1 ?? null, h24: a.transactions?.h24 ?? null },
    }
  })
}

const loaders: Record<string, () => Promise<unknown>> = {
  coins: async () => {
    const r = await fetchJson<any>('https://api.coingecko.com/api/v3/search/trending')
    if (!r.coins?.length) throw new Error('no trending coins returned')
    return r.coins.map(({ item: i }: any) => ({
      id: i.id,
      name: i.name,
      symbol: i.symbol,
      rank: i.market_cap_rank ?? null,
      thumb: typeof i.small === 'string' && i.small.startsWith('https://') ? i.small : null,
      price: num(i.data?.price),
      change24h: num(i.data?.price_change_percentage_24h?.usd),
      marketCap: i.data?.market_cap ?? null,
      volume: i.data?.total_volume ?? null,
    }))
  },
  trending: async () => pools(await fetchJson(`${GT}/networks/trending_pools?include=base_token&duration=1h`)),
  solana: async () => pools(await fetchJson(`${GT}/networks/solana/trending_pools?include=base_token&duration=1h`)),
  fresh: async () =>
    pools(await fetchJson(`${GT}/networks/solana/new_pools?include=base_token`)).filter((p: any) => (p.liquidity ?? 0) >= 20_000 && (p.vol.h1 ?? 0) >= 5_000),
}

const TTL = 5 * 60_000

export default async () => {
  const s = store()
  const cache = (await s.get('cache/trends', { type: 'json' }).catch(() => null)) as Record<string, Section<unknown>> | null
  const due = Object.keys(loaders).filter((k) => !cache?.[k] || cache[k].stale || Date.now() - cache[k].t > TTL)
  let sections = cache ?? {}
  if (due.length) {
    sections = await refreshSections(cache, loaders, due)
    await s.setJSON('cache/trends', sections).catch(() => {})
  }
  const fomo = (await s.get('fomo/view', { type: 'json' }).catch(() => null)) ?? { enabled: false }
  return new Response(JSON.stringify({ now: Date.now(), sections, fomo }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
      'netlify-cdn-cache-control': 'public, s-maxage=180, stale-while-revalidate=600',
    },
  })
}

export const config: Config = { path: '/api/trends' }
