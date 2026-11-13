# Trillion

A trading command centre: live markets, market intel, on-chain trends, a
paper-trading bot for gold and bitcoin, and a backtester. Installable as an
app from the browser (Add to Home Screen). **Paper trading only: no real
orders are ever placed.**

Design and exact strategy rules: [`../docs/superpowers/specs/2026-11-13-trillion-trading-design.md`](../docs/superpowers/specs/2026-11-13-trillion-trading-design.md)

## Layout

| Path | What it is |
| --- | --- |
| `src/engine/` | The trading engine: indicators, swing / break-of-structure / fair-value-gap / liquidity-sweep detection, strategies, bar simulator, metrics, walk-forward. Pure TypeScript, no I/O. |
| `src/bot/` | The paper bot: state, the 5-minute cycle, evidence rules for benching and restoring, weekly re-tune. `seed.json` is each track's starting evidence. |
| `src/data/` | Candle fetchers (Hyperliquid, Binance public archive) and the live websocket. |
| `src/ui/` | The React interface: Command, Markets, Intel, Trends, Bot, Backtest. |
| `netlify/functions/` | `bot-tick` (scheduled every 5 min), `api-bot`, `api-intel`, `api-trends`, `fomo-track` (scheduled, off without a key). |
| `tests/` | Engine, bot and assistant tests. |
| `scripts/` | `backtest.ts`, `diagnose.ts`, `seed.ts`, `replay.ts`. |

The backtester and the bot run the same engine, and a test asserts that the
bot, fed bars one cycle at a time, produces exactly the trades the backtester
produces over the same bars.

## Commands

```bash
npm install
```

```bash
npm test
```

```bash
npm run build
```

Run every strategy on real history from the terminal (days, then a cache folder):

```bash
npx tsx scripts/backtest.ts 120 .cache
```

Regenerate the bot's starting evidence (one-year backtest per track):

```bash
npx tsx scripts/seed.ts 365 .cache
```

Run the whole app locally, functions included:

```bash
netlify dev --offline --dir dist --framework '#static' -p 8888
```

## Hosting

Deployed to Netlify (site `trillion-hq`). The bot is the scheduled function
`bot-tick`; its state lives in Netlify Blobs (store `trillion`).

Environment variables on the Netlify site:

| Name | Purpose |
| --- | --- |
| `TRILLION_PIN` | Enables Pause / Resume on the Bot screen. Without it the bot is read-only from the app. |
| `BITQUERY_TOKEN` | Switches on the fomo wallet tracker. Optional. |

Netlify's free plan is metered in credits and each production deploy costs
credits, so deploy deliberately rather than on every small change.

## What to know before trusting the numbers

- Prices for gold, the S&P 500 and the Nasdaq 100 are Hyperliquid perpetual
  contracts that track the underlying. They are close to, but not, the
  official exchange prints.
- Deep gold history for backtests is PAXG (tokenised gold) on Binance.
- Costs decide everything on a 5-minute chart. Bitcoin is modelled as a crypto
  perp (maker 1.5 / taker 4.5 bps); gold as a futures/CFD account (0.5 bps per
  side). Change `BOT_COSTS` in `src/bot/types.ts` to match where you would
  really trade, then re-run the seed script.
- Fills are simulated from 5-minute bars. If a bar touches both stop and
  target, the stop is assumed first.
- The fomo wallet tracker has not been run against live data.
