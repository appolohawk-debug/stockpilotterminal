# StockPilot NSE Terminal

A self-hosted stock dashboard for Indian retail investors. Track your NSE/BSE portfolio, monitor watchlists, and get Technical + Fundamental signal scores at a glance. Free forever. No paid API keys required.

> **Live on Vercel** — [stockpilotterminal.vercel.app](https://stockpilotterminal.vercel.app)
> **GitHub** — [github.com/appolohawk-debug/stockpilotterminal](https://github.com/appolohawk-debug/stockpilotterminal)

---

## What It Does

- **Portfolio** — Import holdings from Zerodha Console CSV; tracks average cost and unrealized P&L in ₹
- **Watchlist** — Add any NSE/BSE stock; see live price, day change, and inline signal scores at a glance
- **Signal Pills** — Every watchlist row shows two compact pills (T·F) for Technical and Fundamental scores without navigating away. Green ≥70, Yellow 40–69, Red <40
- **Market Header** — NIFTY 50, SENSEX, NIFTY BANK always visible at the top
- **Stock Detail** — Candlestick/line chart (1D–1Y), fundamentals panel, 52-week range, full signal breakdown
- **Bulk Watchlist Import** — Paste ticker symbols or upload a Zerodha Holdings CSV to add multiple stocks at once
- **Search** — ⌘K global search across all NSE/BSE tickers with 300ms debounce and direct-navigation fallback

---

## Quick Start

### Prerequisites

This app requires a [Turso](https://turso.tech) database (free tier) for portfolio/watchlist storage.

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create stockpilot
turso db show stockpilot --url          # → TURSO_DATABASE_URL
turso db tokens create stockpilot       # → TURSO_AUTH_TOKEN
```

### Local development

```bash
git clone https://github.com/appolohawk-debug/stockpilotterminal.git
cd stockpilotterminal
cp .env.example .env.local
# Edit .env.local with your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel (recommended)

1. Fork or clone this repo to your GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo
3. Add environment variables:
   - `TURSO_DATABASE_URL` — your Turso database URL
   - `TURSO_AUTH_TOKEN` — your Turso auth token
4. Click **Deploy** — done. Every push to `main` auto-deploys.

### Docker (self-hosted)

```bash
git clone https://github.com/appolohawk-debug/stockpilotterminal.git
cd stockpilotterminal
# Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in docker-compose.yml or as env vars
docker compose up --build
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Turso credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes | Turso DB URL (`libsql://your-db.turso.io`) |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |

> **Local alternative:** Set `TURSO_DATABASE_URL=file:./data/portfolio.db` to use a local SQLite file instead of the cloud DB. No token needed in this mode.

---

## Zerodha Import

### Portfolio holdings
1. Log in to [console.zerodha.com](https://console.zerodha.com)
2. Go to **Portfolio → Holdings → Download CSV**
3. In StockPilot, go to **Portfolio → Import CSV**
4. Drop the file — holdings are parsed and loaded automatically

### Watchlist (bulk import)
1. Go to **Watchlist → Bulk Import**
2. Either upload your Zerodha Holdings CSV (it will extract all symbols), or paste tickers manually (one per line or comma-separated)
3. Symbols are auto-normalized to NSE format (`.NS` suffix)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, full-stack — no separate server) |
| UI | React 19, Tailwind CSS v4, TypeScript |
| Charts | lightweight-charts v5 (TradingView OSS) |
| State | Zustand + TanStack Query |
| Market data | Yahoo Finance public API (direct fetch, no library, no API key) |
| Runtime | Vercel Edge for all market-data routes (avoids 429 rate limits) |
| Database | Turso — cloud SQLite (libSQL), free tier |
| Deployment | Vercel (primary) or Docker Compose |

---

## Project Structure

```
app/
  page.tsx                  # Dashboard home (portfolio summary + watchlist with signal pills)
  portfolio/page.tsx        # Full P&L table + CSV import
  watchlist/page.tsx        # Watchlist manager + bulk import
  stock/[ticker]/page.tsx   # Stock detail: chart + full signal breakdown + fundamentals
  api/                      # Next.js API routes (no separate server process)
    market/                 # NIFTY 50, SENSEX, NIFTY BANK — Edge runtime
    quote/[ticker]/         # Single ticker quote — Edge runtime
    chart/[ticker]/         # OHLCV candles — Edge runtime
    signal/[ticker]/        # Technical + Fundamental score (15-min cache) — Edge runtime
    search/                 # Ticker search — Edge runtime
    portfolio/              # CRUD + Zerodha CSV import — Lambda (needs @libsql/client)
    watchlist/              # CRUD — Lambda
    watchlist/import/       # Bulk ticker import — Lambda
lib/
  db.ts                     # Turso (libSQL) client + async schema init (Lambda only)
  yahoo.ts                  # Direct Yahoo Finance fetch wrappers (no external library)
  indicators.ts             # RSI, MACD, SMA, Bollinger, ADX (pure TS, zero deps)
  scoring.ts                # Signal score algorithm (Technical + Fundamental, weighted)
  types.ts                  # Shared TypeScript types
components/
  shared/                   # MarketHeader, SignalBadge, SearchBar (⌘K, debounced)
  portfolio/                # PortfolioTable, CSVImport
  watchlist/                # WatchlistCard, WatchlistBulkImport, SignalPills
  charts/                   # StockChart (lightweight-charts v5)
```

---

## Roadmap

| Phase | Status | Features |
|---|---|---|
| V1 | ✅ **Done** | Portfolio P&L, Zerodha CSV import, watchlist CRUD, bulk watchlist import, market header, stock detail chart, Technical + Fundamental signal scores, inline signal pills on watchlist, global search, Vercel Edge runtime |
| V2 | Planned | News feed per ticker, allocation pie chart, CSV export, price alerts |
| V3 | Planned | Mobile-optimised layout, AI assistant (Claude), keyboard shortcuts |

---

## Data & Privacy

- All market data fetched from Yahoo Finance public endpoints — no account needed, no API key
- Market data routes run on **Vercel Edge** (Cloudflare network) to avoid Yahoo Finance rate limits
- Portfolio data stored in your private Turso database — you own the DB, data is not shared
- No analytics, no telemetry, no third-party tracking
- **Not financial advice** — signal scores are based on public price/fundamental data only
