# StockPilot NSE Terminal — Architecture

## System Overview

Single Next.js 15 app: App Router handles both the React frontend and all API routes. No separate backend process. Turso (cloud libSQL) for persistence. yahoo-finance2 as the sole market data provider.

```
Browser
  └── Next.js (Vercel / localhost:3000)
        ├── React pages (App Router)
        ├── API routes (/api/*)
        │     ├── yahoo-finance2 (npm, HTTP to Yahoo Finance — no API key)
        │     └── @libsql/client (HTTP to Turso cloud DB)
        └── Turso DB (libsql://stockpilot-*.turso.io)
```

**Local development alternative:** set `TURSO_DATABASE_URL=file:./data/portfolio.db` to use a local SQLite file — no Turso account needed for offline dev.

---

## Data Flow

### Market data (quotes, charts)
```
Client component
  → TanStack Query (cache: 60s)
  → GET /api/quote/[ticker]
  → yahoo-finance2.quote(ticker)
  → Yahoo Finance public API
```

### Portfolio
```
Client
  → GET /api/portfolio
      → getDb()                          ← async Turso client
      → db.execute('SELECT * FROM holdings')
      → enrich rows with live quote (getQuotes)
  → POST /api/portfolio/import
      → parse Zerodha CSV (papaparse)
      → db.batch([INSERT holdings, INSERT transactions], 'write')
```

### Signal Score
```
GET /api/signal/[ticker]
  → yahoo-finance2.chart(ticker, { period1: '1y' })   → 250 days OHLCV
  → yahoo-finance2.quoteSummary(ticker, modules)       → fundamentals
  → lib/indicators.ts  → RSI, MACD, SMA, Bollinger, ADX, Volume
  → lib/scoring.ts     → Technical score (0-100) + Fundamental score (0-100)
  → { technical: { score, label, breakdown }, fundamental: { score, label, breakdown } }
  Cache-Control: s-maxage=900 (15 min)
```

---

## Database

### Provider
**Turso** — cloud-hosted libSQL (SQLite wire-compatible). Free tier: 500MB storage, 1B row reads/month.

Connection is managed in `lib/db.ts` via `@libsql/client`. Schema is auto-created on first request using `db.batch()` with `CREATE TABLE IF NOT EXISTS` — no migration tooling required.

### Schema

```sql
-- Holdings (current positions)
CREATE TABLE IF NOT EXISTS holdings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL UNIQUE,
  shares     REAL NOT NULL,
  avg_cost   REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction log
CREATE TABLE IF NOT EXISTS transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL,
  type       TEXT NOT NULL,   -- 'BUY' | 'SELL'
  shares     REAL NOT NULL,
  price      REAL NOT NULL,
  date       TEXT NOT NULL,
  notes      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL UNIQUE,
  group_name TEXT DEFAULT 'Default',
  added_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### DB client pattern

`getDb()` is async and returns a singleton `@libsql/client` instance. Schema init runs once per cold start (guarded by `_initialized` flag):

```ts
const db = await getDb()
const result = await db.execute('SELECT * FROM holdings ORDER BY ticker')
// result.rows → array of Row objects with named properties
```

For writes with multiple statements, use `db.batch([...statements], 'write')` — this is atomic.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/market` | NIFTY 50, SENSEX, NIFTY BANK — live (revalidate: 30s) |
| GET | `/api/quote/[ticker]` | Full quote for one ticker |
| GET | `/api/chart/[ticker]?range=6mo&interval=1d` | OHLCV candles |
| GET | `/api/signal/[ticker]` | Technical + Fundamental score (cache: 15 min) |
| GET | `/api/search?q=reliance` | Ticker search — NSE/BSE only |
| GET | `/api/portfolio` | All holdings enriched with live P&L |
| POST | `/api/portfolio` | Add holding manually |
| DELETE | `/api/portfolio?id=N` | Remove holding |
| POST | `/api/portfolio/import` | Parse Zerodha CSV + bulk batch insert |
| GET | `/api/watchlist` | All watchlist items with live quote |
| POST | `/api/watchlist` | Add ticker to watchlist |
| DELETE | `/api/watchlist?id=N` | Remove from watchlist |

---

## Signal Scoring Algorithm

### Technical Score (0–100)

Each sub-indicator returns a score 0–100, then weighted:

| Indicator | Calculation | Green | Red | Weight |
|---|---|---|---|---|
| RSI (14) | Standard Wilder RSI | 40–60 | <25 or >75 | 20% |
| SMA trend | Price vs SMA50, SMA200; SMA50 vs SMA200 | All above | All below | 25% |
| MACD | EMA12 − EMA26, signal EMA9 | Histogram > 0 | Histogram < 0 | 20% |
| Volume | Close volume vs 20-day avg volume | Vol up on up-day | Vol up on down-day | 15% |
| ADX (14) | Wilder ADX | ADX > 25 | ADX < 15 | 10% |
| Bollinger | %B = (price − lower) / (upper − lower) | 0.3–0.7 | <0.05 or >0.95 | 10% |

**Score → Label:** 70–100 = 🟢 GREEN · 40–69 = 🟡 YELLOW · 0–39 = 🔴 RED

### Fundamental Score (0–100)

| Factor | Source | Green | Red | Weight |
|---|---|---|---|---|
| P/E ratio | Yahoo summaryDetail | < 25 | > 60 or negative | 30% |
| Price/Book | Yahoo defaultKeyStatistics | < 3 | > 10 | 25% |
| Debt/Equity | Yahoo financialData | < 0.5 | > 2 | 25% |
| EPS Growth (QoQ) | Yahoo defaultKeyStatistics | > 10% | < 0% | 20% |

**Score → Label:** 70–100 = 🟢 GREEN · 40–69 = 🟡 YELLOW · 0–39 = 🔴 RED

> Signal scores are based on price/fundamental data only. Not financial advice.

---

## Ticker Convention

All tickers stored in Yahoo Finance NSE format: `SYMBOL.NS`

| Input | Stored as |
|---|---|
| RELIANCE | RELIANCE.NS |
| TCS | TCS.NS |
| NIFTY 50 index | ^NSEI |
| SENSEX | ^BSESN |
| NIFTY BANK | ^NSEBANK |

`toNSETicker()` in `lib/yahoo.ts` handles the conversion automatically.

---

## Caching Strategy

| Data | Cache TTL | Where |
|---|---|---|
| Live quotes | 60 seconds | TanStack Query (client) |
| OHLCV chart data | 5 minutes | TanStack Query (client) |
| Signal scores | 15 minutes | `Cache-Control: s-maxage=900` (Vercel CDN) |
| Fundamentals | 24 hours | yahoo-finance2 internal |
| Market header | 30 seconds | TanStack Query `refetchInterval` |

---

## Deployment

### Vercel (primary)

Auto-deploys on every push to `main`. No configuration file needed — Vercel detects Next.js automatically.

Required env vars in Vercel dashboard:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### Local development

```bash
cp .env.example .env.local   # add Turso credentials
npm install
npm run dev                  # http://localhost:3000
```

Or use a local SQLite file (no Turso account needed):
```bash
TURSO_DATABASE_URL=file:./data/portfolio.db npm run dev
```

### Docker (self-hosted)

```bash
docker compose up --build
# Pass TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as environment variables
```

### Migrating to another DB

`lib/db.ts` uses the `@libsql/client` interface. To switch providers:
- **Local SQLite only:** change URL to `file:./data/portfolio.db`, remove `authToken`
- **Another libSQL host:** update URL and token — zero other changes
- **PostgreSQL/MySQL:** would require rewriting `lib/db.ts` and the three API route files only
