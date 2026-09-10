# StockPilot NSE Terminal — Project Context

## What this is
Personal Indian stock portfolio dashboard for NSE/BSE. Deployed on Vercel, free tier.
Owner: Deepak (I047166). Located at `claude101pro/self/STKPilotTerminal/`.
GitHub: https://github.com/appolohawk-debug/stockpilotterminal

## Stack
- Next.js 15 App Router (full-stack — no separate backend)
- React 19, TypeScript, Tailwind CSS v4
- lightweight-charts for financial charts
- yahoo-finance2 for NSE/BSE market data (free, no key)
- **Turso** (libSQL / @libsql/client) — cloud SQLite, free tier
- Zustand + TanStack Query for state/data fetching
- Vercel for deployment (auto-deploy on push to main)

## Database: Turso
- DB URL: `libsql://stockpilot-appolohawk-debug.aws-ap-northeast-1.turso.io`
- Credentials in `.env.local` (gitignored) and Vercel env vars
- `lib/db.ts` exports async `getDb()` — singleton client, schema init on first cold start
- For local dev without Turso: `TURSO_DATABASE_URL=file:./data/portfolio.db`

## Key lib files
- `lib/db.ts` — Turso (libSQL) async client, `CREATE TABLE IF NOT EXISTS` schema init
- `lib/yahoo.ts` — yahoo-finance2 wrappers, toNSETicker(), getHistoricalCloses()
- `lib/indicators.ts` — RSI, EMA, MACD, Bollinger, ADX, SMA (pure TS, no deps)
- `lib/scoring.ts` — Technical score (6 indicators, weighted) + Fundamental score (4 factors, weighted)
- `lib/types.ts` — All shared types

## Signal scoring
Two independent 0-100 scores → GREEN(70+) / YELLOW(40-69) / RED(<40)
- **Technical**: RSI(20%), SMA(25%), MACD(20%), Volume(15%), ADX(10%), Bollinger(10%)
- **Fundamental**: P/E(30%), P/B(25%), Debt/Equity(25%), EPS Growth(20%)

## Ticker convention
All stored as Yahoo Finance NSE format: `SYMBOL.NS` (e.g. `RELIANCE.NS`)
Market indices: `^NSEI` (NIFTY 50), `^BSESN` (SENSEX), `^NSEBANK` (NIFTY BANK)

## Zerodha CSV import
POST `/api/portfolio/import` — parses Zerodha Console CSV, auto-appends `.NS`, batch inserts via `db.batch()`

## Run locally
```bash
cp .env.example .env.local   # add TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
npm install && npm run dev   # http://localhost:3000
```

## V1 status: Scaffold complete, pushed to GitHub, Turso wired up. Ready for Vercel deploy.
Next: deploy on Vercel → test with RELIANCE.NS → fix any runtime issues.
