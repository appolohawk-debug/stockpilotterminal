# StockPilot NSE Terminal — Project Context

## What this is
Personal Indian stock portfolio dashboard for NSE/BSE. Deployed on Vercel, free tier.
Owner: Deepak (I047166). Located at `claude101pro/self/STKPilotTerminal/`.
GitHub: https://github.com/appolohawk-debug/stockpilotterminal

## Stack
- Next.js 15 App Router (full-stack — no separate backend)
- React 19, TypeScript, Tailwind CSS v4
- lightweight-charts v5 for financial charts
- Direct Yahoo Finance fetch (no npm library, no API key — uses browser UA headers)
- **Vercel Edge runtime** for all Yahoo Finance routes (avoids AWS Lambda 429 blocks)
- **Turso** (libSQL / @libsql/client) — cloud SQLite, free tier
- Zustand + TanStack Query for state/data fetching
- papaparse for Zerodha CSV parsing
- Vercel for deployment (auto-deploy on push to main)

## Database: Turso
- DB URL: `libsql://stockpilot-appolohawk-debug.aws-ap-northeast-1.turso.io`
- Credentials in `.env.local` (gitignored) and Vercel env vars
- `lib/db.ts` exports async `getDb()` — singleton client, schema init on first cold start
- For local dev without Turso: `TURSO_DATABASE_URL=file:./data/portfolio.db`

## Key lib files
- `lib/db.ts` — Turso (libSQL) async client, schema init (Lambda only — not Edge-compatible)
- `lib/yahoo.ts` — Direct Yahoo Finance `fetch()` wrappers: `getQuote`, `getQuotes`, `getChart`, `getHistoricalCloses`, `getFundamentals`, `searchTickers`, `toNSETicker()`
- `lib/indicators.ts` — RSI, EMA, MACD (returns `macd`, `signalLine`, `histogram`), Bollinger, ADX, SMA (pure TS, no deps)
- `lib/scoring.ts` — Technical score (6 indicators, weighted) + Fundamental score (4 factors, weighted)
- `lib/types.ts` — All shared types

## Signal scoring
Two independent 0-100 scores → GREEN(70+) / YELLOW(40-69) / RED(<40)
- **Technical**: RSI(20%), SMA(25%), MACD(20%), Volume(15%), ADX(10%), Bollinger(10%)
- **Fundamental**: P/E(30%), P/B(25%), Debt/Equity(25%), EPS Growth(20%)

Inline signal pills (T·F colored badges) show on every watchlist row — loaded lazily per ticker, cached 15 min via TanStack Query + Vercel CDN.

## Ticker convention
All stored as Yahoo Finance NSE format: `SYMBOL.NS` (e.g. `RELIANCE.NS`)
Market indices: `^NSEI` (NIFTY 50), `^BSESN` (SENSEX), `^NSEBANK` (NIFTY BANK)

## Zerodha import
- **Portfolio**: POST `/api/portfolio/import` — parses Zerodha Console CSV, auto-appends `.NS`, batch inserts via `db.batch()`
- **Watchlist**: POST `/api/watchlist/import` — accepts `{ tickers: string[] }`, normalizes via `toNSETicker()`, batch inserts with `ON CONFLICT DO NOTHING`

## Runtime split
| Routes | Runtime | Reason |
|---|---|---|
| `/api/market`, `/api/quote`, `/api/chart`, `/api/signal`, `/api/search` | Edge | Yahoo Finance 429 on Lambda; Cloudflare IPs not blocked |
| `/api/portfolio`, `/api/watchlist` | Lambda | `@libsql/client` incompatible with Edge |

## Run locally
```bash
cp .env.example .env.local   # add TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
npm install && npm run dev   # http://localhost:3000
```

## V1 status: COMPLETE ✅
All V1 features shipped and live on Vercel:
- Portfolio P&L, Zerodha CSV import
- Watchlist CRUD + bulk import (CSV or paste)
- Market header (NIFTY/SENSEX/NIFTY BANK)
- Stock detail page (chart, fundamentals, full signal breakdown)
- Technical + Fundamental signal scores (0-100 + GREEN/YELLOW/RED)
- Inline signal pills on every watchlist row (lazy, 15-min cache)
- Global search with debounce + direct-navigation fallback
- Edge runtime fix for Yahoo Finance 429
