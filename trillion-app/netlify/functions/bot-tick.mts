import type { Config } from '@netlify/functions'
import { cycle } from '../lib/cycle'

/** The paper-trading bot. Netlify runs this on every 5-minute bar close. */
export default async () => {
  try {
    const r = await cycle({ retune: true })
    console.log(`tick ok: ${r.bars} bars, ${r.trades} closed, equity ${r.equity.toFixed(2)}, ${r.ms}ms`)
  } catch (e) {
    // Nothing is saved on failure, so the next cycle simply replays these bars.
    console.error('tick failed', e)
  }
  return new Response('ok')
}

export const config: Config = { schedule: '*/5 * * * *' }
