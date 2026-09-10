# StockPilot NSE Terminal

A private, self-hosted stock dashboard for Indian retail investors. Track your NSE/BSE portfolio, monitor watchlists, and get a clear Technical + Fundamental signal on any stock. Free forever. No API keys. Your data stays on your machine.

---

## What It Does

- **Portfolio** — Import holdings from Zerodha Console CSV, log transactions, track average cost and unrealized P&L in ₹
- **Watchlist** — Add any NSE/BSE stock, see live price and day change at a glance
- **Market Header** — NIFTY 50, SENSEX, NIFTY BANK always visible at the top
- **Stock Detail** — Candlestick/line chart (1D–1Y), fundamentals panel, news feed
- **Signal Score** — Two separate scores: **Technical** (RSI, MACD, SMA, Volume, ADX, Bollinger) and **Fundamental** (P/E, P/B, D/E, EPS growth) — each rendered as a single 🟢 / 🟡 / 🔴 badge
- **Search** — ⌘K global search across all NSE/BSE tickers

---

## Quick Start

### Local (no Docker)
```bash
git clone https://github.com/appolohawk-debug/stockpilotterminal.git
cd stockpilotterminal
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Docker
```bash
git clone https://github.com/appolohawk-debug/stockpilotterminal.git
cd stockpilotterminal
docker compose up --build
```
Portfolio database persists in `./data/portfolio.db` (Docker volume mapped to host).

---

## Environment Variables

Copy `.env.example` to `.env.local` — no values are required for core functionality.

```bash
cp .env.example .env.local
```

Optional: add your Anthropic API key to enable the AI assistant in V2.

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
| Framework | Next.js 15 (App Router, full-stack) |
| UI | React 19, Tailwind CSS v4, TypeScript |
| Charts | lightweight-charts (TradingView OSS) |
| State | Zustand + TanStack Query |
| Market data | yahoo-finance2 (free, no API key) |
| Database | SQLite via better-sqlite3 |
| Deployment | Docker Compose or bare `npm run dev` |

---

## Project Structure

```
app/
  page.tsx                  # Dashboard home (portfolio summary + watchlist)
  portfolio/page.tsx        # Full P&L table + CSV import
  watchlist/page.tsx        # Watchlist manager
  stock/[ticker]/page.tsx   # Stock detail: chart + signals + news
  api/                      # Next.js API routes (no separate server)
    market/                 # NIFTY 50, SENSEX, NIFTY BANK
    quote/[ticker]/
    chart/[ticker]/
    signal/[ticker]/        # Technical + Fundamental score computation
    search/
    portfolio/              # CRUD + CSV import
    watchlist/
lib/
  db.ts                     # SQLite connection + schema init
  yahoo.ts                  # yahoo-finance2 wrappers
  indicators.ts             # RSI, MACD, SMA, Bollinger, ADX calculations
  scoring.ts                # Signal score algorithm (Technical + Fundamental)
  types.ts                  # Shared TypeScript types
components/
  shared/                   # MarketHeader, SignalBadge, SearchBar
  portfolio/                # PortfolioTable, CSVImport
  watchlist/                # WatchlistCard
  charts/                   # StockChart
data/
  portfolio.db              # SQLite file (gitignored)
```

---

## Roadmap

| Phase | Features |
|---|---|
| V1 (now) | Zerodha import, portfolio P&L, watchlist, market header, stock detail, signal scores |
| V2 | News feed per ticker, allocation pie chart, CSV export, price alerts |
| V3 | Mobile-optimised layout, AI assistant (Claude), keyboard shortcuts throughout |

---

## Data & Privacy

- All market data fetched from Yahoo Finance public endpoints — no account needed
- Portfolio data stored in a local SQLite file — never leaves your machine
- No analytics, no telemetry, no third-party tracking
- Not financial advice — signal scores are based on price/fundamental data only
