# Trillion — trading command centre: design

Approved 2026-11-13. Lives in `trillion-app/`. Paper trading only.

## Shape

One installable web app (PWA) on Netlify, plus Netlify Functions and Netlify
Blobs for state. One TypeScript trading engine (`src/engine/`) is imported by
both the in-browser backtester and the server-side bot, so a backtest and the
live paper bot run identical rules.

```
browser (React PWA)                    Netlify
  Command  voice orb + brief     ─┐
  Markets  live charts ───────────┼──► Hyperliquid public API (REST + WS)
  Intel    calendar/IPO/news ─────┼──► /api/intel   (RSS, ForexFactory, Nasdaq; cached)
  Trends   trending coins ────────┼──► /api/trends  (CoinGecko, GeckoTerminal, DexScreener; cached)
  Bot      journal, health ───────┼──► /api/bot     (reads Blobs state)
  Backtest worker ────────────────┘──► Binance public archive (deep 5m history)

  bot-tick (scheduled */5)  ──► candles ──► engine ──► Blobs (state, journal, equity)
  fomo-track (scheduled, off until BITQUERY_TOKEN is set)
```

## Data

| Need | Source | Notes |
| --- | --- | --- |
| Live BTC, gold, S&P 500, Nasdaq-100 | Hyperliquid `BTC`, `xyz:GOLD`, `xyz:SP500`, `xyz:XYZ100` | Perpetual contracts that track the underlying; 24/7; no key. Not the official cash index print. |
| Deep history for backtests | Binance public archive `BTCUSDT`, `PAXGUSDT` (tokenised gold) | 5m candles back to 2017 / 2020. |
| Recent history | Hyperliquid, ~17 days of 5m | Same instrument the bot trades. |
| Calendar / IPOs / news | ForexFactory weekly JSON, Nasdaq IPO calendar, RSS | Server-side, cached 10 min. |
| Trends | CoinGecko trending, GeckoTerminal trending + new pools, DexScreener boosts | Cached 5 min. |
| fomo | No public API; leaderboard is behind login. | On-chain tracker via Bitquery, Solana only, off until a key is set. |

## Strategies

All trade the 5-minute chart. Shared definitions:

- **Swing high/low**: a bar whose high (low) is above (below) the `n` bars on
  each side. Known only `n` bars later; the engine never uses it earlier.
- **Break of structure (BOS)**: a close beyond the most recent unbroken swing.
  Trend is the direction of the latest break.
- **Fair value gap (FVG)**: three bars where bar 3's low is above bar 1's high
  (bullish) or bar 3's high is below bar 1's low (bearish). Gaps smaller than
  0.1 ATR are ignored.
- **Liquidity level**: an unswept 15m or 1h swing high/low, or the previous
  day's high/low. A **sweep** is a bar trading through a level and closing
  back inside.

### 1. Buy and hold
Enter at the first bar, exit at the last. The baseline every result is shown against.

### 2. Trillion Liquidity (owner's strategy)
0. **Daily bias** (added 2026-11-18 at the owner's request): from the last completed UTC
   day against the day before it. A close above the prior day's high is bullish, below its
   low bearish; a run above the prior high that closes back inside is bearish, a run below
   the prior low that closes back inside is bullish; anything else is neutral and blocks
   trades. The 1h bias must agree with it.
1. **Bias (1h)**: latest 1h break of structure sets long-only or short-only.
2. **Confirmation (15m)**: 15m structure must point the same way.
3. **Setup (5m)**, for longs (shorts mirrored):
   - a sell-side liquidity level is swept within the last 36 bars (3h);
   - then a 5m close breaks above the most recent 5m swing high;
   - the move from the sweep to the break left a bullish FVG.
4. **Entry**: limit order at the middle of the FVG, valid for 12 bars.
5. **Stop**: below the low of the sweep, minus 0.1 ATR.
6. **Target**: 2.5 × risk.
7. Skipped if the stop is tighter than 0.5 ATR or wider than 4 ATR.

### 2b. Liquidity, tap entry (trial, added 2026-11-18)
Same setup as Trillion Liquidity. Instead of a resting limit order, wait for price to tap
the gap, then enter at market on the first close that breaks a 1-bar swing back in the
trade direction. Same stop, 2.5R target. Shadow only: the bot never restores a trial
track to paper money on its own. Two years, six markets: 103 trades, +0.03R per trade.

### 3. ICT (session model)
1. Only during the London (02:00–05:00 New York) and New York AM
   (08:30–11:00 New York) windows.
2. Liquidity is the Asian session range (20:00–00:00 New York) and the
   previous day's high/low.
3. Price sweeps one of those levels, then a 5m close breaks the opposing swing
   (market structure shift) leaving an FVG.
4. Limit entry at the middle of the FVG, stop beyond the sweep extreme,
   target 2 × risk.

### 4. VWAP + EMA scalper (public)
Long when the 9 EMA crosses above the 21 EMA with price above the day's VWAP
and the 200 EMA and RSI(14) above 50. Short mirrored. Market entry on the next
bar, stop 1.5 ATR, target 2 × risk.

## Simulation rules (backtest and bot)

- Signals form on a closed bar; orders act from the next bar.
- If a bar touches both stop and target, the stop is assumed first.
- On the entry bar only the stop is checked, unless the bar closes beyond target.
- Costs: 4.5 bps fee per side, plus 1 bp slippage on market and stop fills. Adjustable.
- Size: 1% of equity risked per trade in the bot (raised from 0.5% on 2026-11-16 at the owner's request), notional capped at 5× equity.
- Time stop: 96 bars (8h).

## Backtest output

Net return, max drawdown, Sharpe, profit factor, win rate, expectancy in R,
trade list and equity curve against buy and hold; the same figures for the
last 30% of the data on its own (out-of-sample); a 1,000-run reshuffle of the
trade sequence for the 5th–95th percentile of outcomes; and a walk-forward
check that tunes on one window and scores on the next.

## Bot

- Runs every 5 minutes. Six tracks: three strategies × gold and BTC.
- $10,000 paper equity, 1% risk per trade, one position per market,
  daily loss limit 2%, three losses in a row pauses that track for 2h.
- **Self-healing**: every tick is idempotent and replays any bars it missed;
  candles are validated (gaps, order, staleness) and the bot falls back to a
  second data source; state is backed up each tick and restored if unreadable;
  a position is only managed on the source it was opened on; every incident
  is logged and shown.
- **Learning**: every signal is journalled with its context (session,
  volatility regime, side). A context or track whose shrunk expectancy drops
  below −0.15R after 12+ trades is benched. Benched contexts keep trading in
  shadow (no equity at risk) and are restored when their numbers recover.
  Once a week each track re-tunes a small parameter grid on recent data and
  adopts a change only if it also wins on bars it was not tuned on.

## Not in this version

Real-money execution. A conversational LLM behind the voice (the voice answers
a fixed set of commands). Reading fomo's in-app leaderboard.
