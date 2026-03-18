# PacificaLens

**Real-time trading intelligence dashboard for Pacifica perpetuals.**  
Built for the [Pacifica Hackathon 2026](https://pacifica.gitbook.io/docs/hackathon/pacifica-hackathon) — Analytics & Data track.

🔗 **Live Demo:** [pacifica-lens.vercel.app](https://pacifica-lens.vercel.app)

---

## Overview

PacificaLens is a single-page, zero-install trading intelligence platform that connects directly to Pacifica's WebSocket API and surfaces market data that traders actually need: live funding rates, liquidation feeds, arbitrage opportunities, whale activity, and macro context — all in one place.

The app is designed for traders who want to understand what's happening across all Pacifica markets at a glance, and for algorithmic traders who need a live dashboard alongside their bots.

---

## Features

### Intelligence Page
The global macro layer of the dashboard.

- **Economic Calendar** — 25+ scheduled events (FOMC, ECB, BoJ, NFP, CPI, PCE, BoE, PBOC, BoC, RBA and more) with live countdowns, color-coded impact levels (High / Medium / Low), and country filters (US / EU / JP / CN / UK / Global)
- **3D Rotating Globe** — Interactive Three.js WebGL globe showing central bank event locations as clickable markers. Pulses on high-impact events. Drag to rotate, auto-rotates when idle. Live news volume dots appear per country as headlines arrive
- **Global News Feed** — Real-time crypto and macro news via CryptoCompare API with CoinDesk RSS fallback. Each headline shows the article thumbnail image and links directly to the full article. Filterable by Crypto / Macro / Equities
- **Market Stats Bar** — Fear & Greed Index (Alternative.me), BTC Dominance, Global Crypto Market Cap, 24h Volume, Active Events — all live

### Overview Page
The live heartbeat of Pacifica markets.

- **Market Snapshot** — Active markets count, Total OI, 24h Volume, Average Funding APR, Best Arb Spread — updating in real time via WebSocket
- **Ticker Strip** — Horizontally scrolling price ticker for all active markets with color-coded % change
- **Top Markets Grid** — Compact sparkline cards for every active market showing live price, 24h change %, and mini price history chart
- **Live Trade Feed** — Every taker trade on Pacifica as it happens: OPEN LONG / OPEN SHORT / CLOSE LONG / CLOSE SHORT, with USD size and timestamp. Liquidation trades highlighted separately
- **Funding Rate Heatmap** — Color-coded grid of all markets' current 8h funding rates. Green = longs pay, Red = shorts pay
- **Funding Rate Table** — Sortable table with Rate/8h, Annualized %, and Open Interest for every market
- **Long / Short Ratio** — Live L/S volume split per market shown as horizontal bar charts
- **Smart Alerts** — Automatic detection of extreme funding rates above configurable thresholds
- **Top 5 Funding Rate History Chart** — Multi-line chart of the 5 highest-APR markets over time
- **Funding Rate Ranking** — Sorted list of all markets by absolute funding APR with visual progress bars
- **Whale Activity Summary** — Aggregated large-position activity for the session

### Arbitrage Bot Page
Full funding rate arbitrage workflow, from detection to execution guidance.

- **Live Opportunities Table** — All cross-market funding spread pairs sorted by APR. Shows: FR Long, FR Short, Spread/8h, Annualized APR, signal strength
- **Best Opportunity Card** — Auto-highlights the highest spread pair with plain-language position description
- **Performance Metrics** — Session stats: opportunities found, average spread APR, best APR seen, simulated 30-day profit on $10K, active pairs count
- **Spread History Chart** — Time-series chart of best pair APR over the session, updating live
- **Strategy Cards** — Three explained strategies: Cash & Carry (delta-neutral), Funding Fade (directional mean-reversion), Cross-Market Spread (market-neutral multi-leg)
- **Telegram Alerts** — Enter your bot token and chat ID; alerts fire when a pair crosses your APR threshold
- **Discord Alerts** — Webhook integration with rich embed messages (pair, APR, monthly estimate, risk level)
- **Python Bot** — Complete production-ready Python implementation in `bot/funding_arb_bot.py`

### Analytics Page
Platform-level data visualization powered by Chart.js.

- **KPI Cards** — Trade Volume, Total Fees, Open Interest, Active Markets with change indicators
- **Trade Volume Chart** — Bar + cumulative line chart, switchable Daily / Weekly / Monthly
- **Platform Revenue Chart** — Fee revenue trend over time
- **Open Interest Chart** — OI over time with area fill
- **Active Users / Trades Charts** — Unique trader count and transaction volume trends
- **Funding Rate History** — Selected symbol's funding rate over the last 72 data points
- **Long / Short Volume Ratio** — Aggregate L/S sentiment across all markets
- **Open Interest by Market** — Market share breakdown
- **24h Volume Dominance** — Volume market share by symbol

### Liquidations Page
Real-time liquidation monitor for risk awareness and market sentiment.

- **Liquidation Heatmap** — Color-coded treemap of liquidation USD volume by market. Switchable 1H / 4H / 12H / 24H windows
- **Funding Rate Heatmap** — Companion heatmap showing current funding rates alongside liquidation data
- **Exchange Liquidations Table** — Per-market breakdown of long vs short liquidation volume
- **Live Liquidation Feed** — Individual events as they arrive: symbol, direction, USD value, timestamp
- **Top 10 Rekt** — Largest individual liquidation events of the session ranked by USD size

### Whale Watcher Page
Tracks large positions to surface institutional-grade moves.

- **Live Whale Feed** — Filters trades above configurable USD threshold with direction and size indicator
- **Session Summary** — Total whale volume, largest single trade, most active whale market

### Orderbook Page
Real-time bid/ask pressure visualization directly from Pacifica.

- **Live Orderbook** — Connects to Pacifica's `book` WebSocket channel on demand. Shows top 15 bid and ask levels with depth bars. Updates every 100ms
- **Spread Display** — Live bid/ask spread in USD and basis points
- **Symbol Selector** — Switch between any active market with automatic resubscription
- **Imbalance Indicator** — Visual measure of buy vs sell pressure at current levels

### Wallet Tracker Page
Position monitoring for connected accounts.

- Real-time unrealized PnL as mark price moves
- Position table: entry price, mark price, size, leverage, liquidation price, margin used
- Account summary: total margin, available margin, total PnL

### AI Assistant Page
Market context powered by Elfa AI social intelligence.

- Pulls current prices and funding rates to inform responses
- Elfa AI surfaces social signal data for Pacifica markets

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (ES2022), single HTML file, no build step |
| 3D Globe | Three.js r128 (WebGL) |
| Charts | Chart.js 4.4.1 |
| Fonts | Inter (UI), JetBrains Mono (numbers) |
| Realtime | Pacifica WebSocket API (`wss://ws.pacifica.fi/ws`) |
| News | CryptoCompare API, CoinDesk RSS |
| Macro | Alternative.me Fear & Greed, CoinGecko Global |
| AI | Elfa AI (via Vercel serverless proxy) |
| Deployment | Vercel (static + serverless functions) |
| Bot | Python 3.8+, `websocket-client`, `requests` |

---

## Pacifica API Integration

PacificaLens connects to four Pacifica WebSocket channels simultaneously:

```
wss://ws.pacifica.fi/ws
```

### Subscriptions

**`prices`** — All markets, updates on change
```json
{ "method": "subscribe", "params": { "source": "prices" } }
```
Used for: funding rates, mark prices, OI, 24h volume, 24h change %, arbitrage calculation, heatmap, smart alerts, funding history

**`trades`** — Per-symbol taker trades
```json
{ "method": "subscribe", "params": { "source": "trades", "symbol": "BTC" } }
```
Auto-subscribed for every new symbol seen in the prices feed. Used for: live trade feed, L/S ratio, whale detection, liquidation identification (via `tc` field: `market_liquidation` / `backstop_liquidation`)

**`liquidations`** — Liquidation events
```json
{ "method": "subscribe", "params": { "source": "liquidations" } }
```
Used for: liquidation heatmap, live feed, exchange table, top 10

**`book`** — Real-time orderbook (on demand)
```json
{ "method": "subscribe", "params": { "source": "book", "symbol": "SOL", "agg_level": 1 } }
```
Subscribed only when Orderbook tab is open. Unsubscribes on symbol change.

### Heartbeat
Sends `{ "method": "ping" }` every 30 seconds to keep the connection alive. Handles disconnect and reconnect automatically.

---

## Python Arbitrage Bot

A standalone Python bot that runs independently from the dashboard.

```
bot/funding_arb_bot.py  (269 lines)
```

### Installation

```bash
pip install websocket-client requests
```

### Usage

```bash
# Telegram only
TELEGRAM_BOT_TOKEN=your_token TELEGRAM_CHAT_ID=your_chat_id python bot/funding_arb_bot.py

# Discord only
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... python bot/funding_arb_bot.py

# Both + custom thresholds
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
ALERT_APR=30 COOLDOWN_MIN=30 python bot/funding_arb_bot.py
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token |
| `TELEGRAM_CHAT_ID` | — | Telegram chat/group ID |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook URL |
| `ALERT_APR` | `30.0` | Minimum APR to trigger alert |
| `MIN_SPREAD` | `0.0003` | Minimum spread/8h to consider |
| `COOLDOWN_MIN` | `60` | Minutes between repeat alerts for same pair |

### What It Does

1. Connects to `wss://ws.pacifica.fi/ws` and subscribes to the `prices` channel
2. Every 10 seconds: scans all N×(N-1)/2 market pairs for funding rate spreads
3. Logs top 5 opportunities with APR, pair names, and long/short legs
4. When best APR exceeds `ALERT_APR`: sends Telegram message + Discord embed with rich formatting
5. Cooldown prevents repeat alerts for the same pair within `COOLDOWN_MIN` minutes
6. Every 10 scans: prints session performance summary (total opps, best APR, simulated P&L on $10K)

### Alert Example

**Telegram:**
```
🔥 Pacifica Arb Alert
Pair: PIPPIN / HYPE
APR: 82.4%  |  Monthly: 6.87%
Long  HYPE   (-0.0023%/8h)
Short PIPPIN (+0.0015%/8h)
Spread: 0.0038%/8h
```

**Discord:** Rich embed with all fields, color-coded, timestamped footer.

---

## Project Structure

```
PacificaLens/
├── index.html              # Entire frontend (~326KB, ~7600 lines)
├── vercel.json             # Vercel deployment config
├── package.json            # Project metadata
├── .env.example            # Environment variable template
├── api/
│   ├── elfa.js             # Elfa AI proxy (Vercel serverless function)
│   └── pacifica.js         # Pacifica REST proxy (Vercel serverless function)
└── bot/
    └── funding_arb_bot.py  # Standalone Python arbitrage bot
```

---

## Deployment

### Vercel (One-click)

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com) → **Add New Project**
3. Framework Preset: **Other** — leave Build Command and Output Directory empty
4. Add environment variables:

| Key | Value |
|-----|-------|
| `ELFA_API_KEY` | Your Elfa AI API key |

5. Deploy — live in ~30 seconds

Subsequent deploys are automatic on every `git push`.

### Local

```bash
npx serve .
# Open http://localhost:3000
```

No build step. No dependencies to install for the frontend.

---

## Supported Markets

All perpetual markets on Pacifica are supported automatically — the app subscribes to every symbol returned by the live `prices` feed and builds the UI dynamically. This includes Pacifica-exclusive markets not found on other exchanges:

`PIPPIN` · `HYPE` · `FARTCOIN` · `VIRTUALS` · `kPEPE` · `EURUSD` · `PAXG` · `XAU` · `NATGAS` · `NVDA` · `TSLA` · `PLTR` · `GOOGL` · `WIF` · `MON` · `ASTER` · `MEGA` · `2Z` · `KBONK` · `STRK` · `ZK` · `ZRO` · `TAO` · `HOOD` · `TRUMP` · `XPL` · `BP` · `COPPER` · `URNM` · `LDO` · `WLD` and all major crypto perps

---

## Hackathon

Built for the **Pacifica Hackathon 2026** (March 16 – April 16, 2026).

**Primary track:** Analytics & Data  
**Secondary track:** Trading Applications & Bots

**Sponsor tools used:** Elfa AI (AI Trading Assistant)

---

## License

MIT

---

*All market data sourced live from Pacifica WebSocket API. No data is stored or logged.*
