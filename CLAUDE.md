# StockPilot NSE Terminal — Project Context

## What this is
Personal Indian stock portfolio dashboard. Self-hosted, free, no API keys required.
Owner: Deepak (I047166). Located at `claude101pro/self/STKPilotTerminal/`.

## Stack
- Next.js 15 App Router (full-stack — no separate backend)
- React 19, TypeScript, Tailwind CSS v4
- lightweight-charts for financial charts
- yahoo-finance2 for NSE/BSE market data (free, no key)
- SQLite (better-sqlite3) at `data/portfolio.db`
- Zustand + TanStack Query for state/data fetching

## Key lib files
- `lib/db.ts` — SQLite init, schema (holdings, transactions, watchlist)
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
POST `/api/portfolio/import` — parses Zerodha Console CSV, auto-appends `.NS`

## Run
```bash
npm install && npm run dev   # http://localhost:3000
```

## V1 status: Scaffold complete. Not yet tested.
Next: npm install, fix any type errors, test with a real NSE ticker.
