# StockPilot NSE Terminal — Architecture

## System Overview

Single Next.js 15 app: App Router handles both the React frontend and all API routes. No separate backend process. Turso (cloud libSQL) for persistence. All market data fetched directly from Yahoo Finance public endpoints via `fetch()` — no npm library, no API key.

```
Browser
  └── Next.js (Vercel / localhost:3000)
        ├── React pages (App Router, client components)
        ├── API routes (/api/*)
        │     ├── Yahoo Finance routes  →  Edge runtime (Cloudflare IPs)
        │     │     fetch('query1.finance.yahoo.com/...')   ← no auth, no library
        │     └── DB routes             →  Lambda runtime
        │           @libsql/client (HTTP to Turso cloud DB)
        └── Turso DB (libsql://stockpilot-*.turso.io)
```

### Why Edge runtime for Yahoo Finance routes?

Yahoo Finance blocks requests from AWS Lambda IP ranges (HTTP 429 Too Many Requests). Vercel Edge functions run on Cloudflare's network instead — those IPs are not rate-limited. All five market-data routes (`/api/market`, `/api/quote`, `/api/chart`, `/api/signal`, `/api/search`) declare `export const runtime = 'edge'`.

DB routes (`/api/portfolio`, `/api/watchlist`, `/api/watchlist/import`) stay on Lambda because `@libsql/client` is incompatible with the Edge runtime.

**Local development alternative:** Set `TURSO_DATABASE_URL=file:./data/portfolio.db` to use a local SQLite file — no Turso account needed for offline dev.

---

## Data Flow

### Market data (quotes, charts)

```
Client component
  → TanStack Query (staleTime: 60s)
  → GET /api/quote/[ticker]           ← Edge runtime
  → fetch('query1.finance.yahoo.com/v7/finance/quote?symbols=TICKER.NS')
  → Yahoo Finance public API          ← browser User-Agent headers
```

### Signal scores

```
GET /api/signal/[ticker]              ← Edge runtime, Cache-Control: s-maxage=900
  → fetch('…/v8/finance/chart/TICKER.NS?range=1y&interval=1d')   → 250 days OHLCV
  → fetch('…/v10/finance/quoteSummary/TICKER.NS?modules=…')       → fundamentals
  → lib/indicators.ts  → RSI, MACD (signalLine), SMA, Bollinger, ADX, Volume
  → lib/scoring.ts     → Technical score (0-100) + Fundamental score (0-100)
  → { technical: { score, label, breakdown }, fundamental: { score, label, breakdown } }
```

### Watchlist signal pills (inline on dashboard)

```
WatchlistCard renders each row
  → <SignalPills ticker="RELIANCE.NS" />
  → useQuery(['signal', ticker], staleTime: 15 min)   ← returns cached on re-render
  → GET /api/signal/[ticker]                           ← Edge, 15-min CDN cache
  → renders two colored pills:  T72 (green)  F55 (yellow)
```

### Portfolio

```
Client
  → GET /api/portfolio                              ← Lambda
      → getDb() → db.execute('SELECT * FROM holdings')
      → enrich rows: fetch /api/quote batch for live prices
  → POST /api/portfolio/import                      ← Lambda
      → parse Zerodha CSV (papaparse)
      → db.batch([INSERT holdings, INSERT transactions], 'write')
```

### Watchlist bulk import

```
POST /api/watchlist/import                          ← Lambda
  → parse body: { tickers: string[] }
  → toNSETicker() normalizes each (appends .NS, deduplicates)
  → db.batch([INSERT ... ON CONFLICT DO NOTHING], 'write')
  → returns { ok, added, tickers }
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

| Method | Route | Runtime | Description |
|---|---|---|---|
| GET | `/api/market` | Edge | NIFTY 50, SENSEX, NIFTY BANK — revalidate 30s |
| GET | `/api/quote/[ticker]` | Edge | Full quote for one ticker |
| GET | `/api/chart/[ticker]?range=6mo&interval=1d` | Edge | OHLCV candles |
| GET | `/api/signal/[ticker]` | Edge | Technical + Fundamental score (cache: 15 min) |
| GET | `/api/search?q=reliance` | Edge | Ticker search |
| GET | `/api/portfolio` | Lambda | All holdings enriched with live P&L |
| POST | `/api/portfolio` | Lambda | Add holding manually |
| DELETE | `/api/portfolio?id=N` | Lambda | Remove holding |
| POST | `/api/portfolio/import` | Lambda | Parse Zerodha CSV + bulk batch insert |
| GET | `/api/watchlist` | Lambda | All watchlist items with live quote |
| POST | `/api/watchlist` | Lambda | Add ticker to watchlist |
| DELETE | `/api/watchlist?id=N` | Lambda | Remove from watchlist |
| POST | `/api/watchlist/import` | Lambda | Bulk import: normalize + batch insert tickers |

---

## Signal Scoring Algorithm

### Technical Score (0–100)

Each sub-indicator returns a score 0–100, then weighted:

| Indicator | Calculation | Green | Red | Weight |
|---|---|---|---|---|
| RSI (14) | Standard Wilder RSI | 40–60 | <25 or >75 | 20% |
| SMA trend | Price vs SMA50, SMA200; SMA50 vs SMA200 | All above | All below | 25% |
| MACD | EMA12 − EMA26, signalLine EMA9 | Histogram > 0 | Histogram < 0 | 20% |
| Volume | Close volume vs 20-day avg volume | Vol up on up-day | Vol up on down-day | 15% |
| ADX (14) | Wilder ADX | ADX > 25 | ADX < 15 | 10% |
| Bollinger | %B = (price − lower) / (upper − lower) | 0.3–0.7 | <0.05 or >0.95 | 10% |

**Score → Label:** 70–100 = GREEN · 40–69 = YELLOW · 0–39 = RED

### Fundamental Score (0–100)

| Factor | Yahoo Finance module | Green | Red | Weight |
|---|---|---|---|---|
| P/E ratio | `summaryDetail` | < 25 | > 60 or negative | 30% |
| Price/Book | `defaultKeyStatistics` | < 3 | > 10 | 25% |
| Debt/Equity | `financialData` | < 0.5 | > 2 | 25% |
| EPS Growth (QoQ) | `defaultKeyStatistics` | > 10% | < 0% | 20% |

**Score → Label:** 70–100 = GREEN · 40–69 = YELLOW · 0–39 = RED

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
| Signal scores | 15 minutes | `Cache-Control: s-maxage=900` (Vercel CDN) + TanStack Query `staleTime: 15min` |
| Market header | 30 seconds | TanStack Query `refetchInterval` |

Signal pills on the watchlist use TanStack Query's cache keyed by ticker — once loaded, the same signal is reused across all renders (dashboard home + /watchlist page) until stale.

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
