# StockPilot NSE Terminal

A self-hosted stock dashboard for Indian retail investors. Track your NSE/BSE portfolio, monitor watchlists, and get a clear Technical + Fundamental signal on any stock. Free forever. No paid API keys required.

> **Live on Vercel** — [stockpilotterminal.vercel.app](https://stockpilotterminal.vercel.app)
> **GitHub** — [github.com/appolohawk-debug/stockpilotterminal](https://github.com/appolohawk-debug/stockpilotterminal)

---

## What It Does

- **Portfolio** — Import holdings from Zerodha Console CSV, log transactions, track average cost and unrealized P&L in ₹
- **Watchlist** — Add any NSE/BSE stock, see live price and day change at a glance
- **Market Header** — NIFTY 50, SENSEX, NIFTY BANK always visible at the top
- **Stock Detail** — Candlestick/line chart (1D–1Y), fundamentals panel, 52-week range
- **Signal Score** — Two separate scores: **Technical** (RSI, MACD, SMA, Volume, ADX, Bollinger) and **Fundamental** (P/E, P/B, D/E, EPS growth) — each rendered as a single 🟢 / 🟡 / 🔴 badge
- **Search** — ⌘K global search across all NSE/BSE tickers

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
| `ANTHROPIC_API_KEY` | No | Optional — enables AI assistant (V2) |

> **Local alternative:** Set `TURSO_DATABASE_URL=file:./data/portfolio.db` to use a local SQLite file instead of the cloud DB. No token needed in this mode.

---

## Zerodha CSV Import

1. Log in to [console.zerodha.com](https://console.zerodha.com)
2. Go to **Portfolio → Holdings → Download CSV**
3. In StockPilot, go to **Portfolio → Import CSV**
4. Drop the file — holdings are parsed and loaded automatically

The importer maps Zerodha's `Tradingsymbol` to NSE tickers (appends `.NS` automatically).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, full-stack — no separate server) |
| UI | React 19, Tailwind CSS v4, TypeScript |
| Charts | lightweight-charts (TradingView OSS) |
| State | Zustand + TanStack Query |
| Market data | yahoo-finance2 (free, no API key) |
| Database | Turso — cloud SQLite (libSQL), free tier |
| Deployment | Vercel (primary) or Docker Compose |

---

## Project Structure

```
app/
  page.tsx                  # Dashboard home (portfolio summary + watchlist)
  portfolio/page.tsx        # Full P&L table + CSV import
  watchlist/page.tsx        # Watchlist manager
  stock/[ticker]/page.tsx   # Stock detail: chart + signals + fundamentals
  api/                      # Next.js API routes (no separate server process)
    market/                 # NIFTY 50, SENSEX, NIFTY BANK
    quote/[ticker]/
    chart/[ticker]/
    signal/[ticker]/        # Technical + Fundamental score computation
    search/
    portfolio/              # CRUD + Zerodha CSV import
    watchlist/
lib/
  db.ts                     # Turso (libSQL) client + async schema init
  yahoo.ts                  # yahoo-finance2 wrappers
  indicators.ts             # RSI, MACD, SMA, Bollinger, ADX (pure TS)
  scoring.ts                # Signal score algorithm (Technical + Fundamental)
  types.ts                  # Shared TypeScript types
components/
  shared/                   # MarketHeader, SignalBadge, SearchBar (⌘K)
  portfolio/                # PortfolioTable, CSVImport
  watchlist/                # WatchlistCard
  charts/                   # StockChart (lightweight-charts)
```

---

## Roadmap

| Phase | Status | Features |
|---|---|---|
| V1 | ✅ Done | Zerodha import, portfolio P&L, watchlist, market header, stock detail, signal scores |
| V2 | Planned | News feed per ticker, allocation pie chart, CSV export, price alerts |
| V3 | Planned | Mobile-optimised layout, AI assistant (Claude), keyboard shortcuts |

---

## Data & Privacy

- All market data fetched from Yahoo Finance public endpoints — no account needed
- Portfolio data stored in your private Turso database — you own the DB, data is not shared
- No analytics, no telemetry, no third-party tracking
- **Not financial advice** — signal scores are based on price/fundamental data only
