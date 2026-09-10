# StockPilot NSE Terminal — Architecture

## System Overview

Single Next.js 15 app: App Router handles both the React frontend and all API routes. No separate backend process. SQLite for persistence. yahoo-finance2 as the sole data provider.

```
Browser
  └── Next.js (port 3000)
        ├── React pages (App Router)
        ├── API routes (/api/*)
        │     └── yahoo-finance2 (npm, HTTP to Yahoo Finance)
        └── SQLite (data/portfolio.db, local file)
```

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
  → GET /api/portfolio  → SQLite SELECT holdings + transactions
  → enriched with live quote for current value + P&L
  → POST /api/portfolio/import  → parse Zerodha CSV → INSERT holdings
```

### Signal Score
```
GET /api/signal/[ticker]
  → yahoo-finance2.chart(ticker, { period1: '1y' })  → 250 days OHLCV
  → yahoo-finance2.quoteSummary(ticker, modules)     → fundamentals
  → lib/indicators.ts  → RSI, MACD, SMA, Bollinger, ADX, Volume
  → lib/scoring.ts     → Technical score (0-100) + Fundamental score (0-100)
  → { technical: { score, label, breakdown }, fundamental: { score, label, breakdown } }
```

---

## Database Schema

```sql
-- Holdings (current positions)
CREATE TABLE holdings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL UNIQUE,
  shares     REAL NOT NULL,
  avg_cost   REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction log
CREATE TABLE transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('BUY','SELL')),
  shares     REAL NOT NULL,
  price      REAL NOT NULL,
  date       TEXT NOT NULL,
  notes      TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist
CREATE TABLE watchlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT NOT NULL UNIQUE,
  group_name TEXT DEFAULT 'Default',
  added_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/market` | NIFTY 50, SENSEX, NIFTY BANK — live |
| GET | `/api/quote/[ticker]` | Full quote for one ticker |
| GET | `/api/chart/[ticker]?range=1y&interval=1d` | OHLCV candles |
| GET | `/api/signal/[ticker]` | Technical + Fundamental score |
| GET | `/api/search?q=reliance` | Ticker search (NSE/BSE) |
| GET | `/api/portfolio` | All holdings with live P&L |
| POST | `/api/portfolio` | Add holding manually |
| DELETE | `/api/portfolio/[id]` | Remove holding |
| POST | `/api/portfolio/import` | Parse Zerodha CSV + bulk insert |
| GET | `/api/watchlist` | All watchlist items with live quote |
| POST | `/api/watchlist` | Add ticker to watchlist |
| DELETE | `/api/watchlist/[id]` | Remove from watchlist |

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

**Score → Label:**
- 70–100 → 🟢 GREEN ("Technically strong")
- 40–69 → 🟡 YELLOW ("Mixed signals")
- 0–39 → 🔴 RED ("Technically weak")

### Fundamental Score (0–100)

| Factor | Source | Green | Red | Weight |
|---|---|---|---|---|
| P/E ratio | Yahoo summaryDetail | < 25 | > 60 or negative | 30% |
| Price/Book | Yahoo defaultKeyStatistics | < 3 | > 10 | 25% |
| Debt/Equity | Yahoo financialData | < 0.5 | > 2 | 25% |
| EPS Growth (QoQ) | Yahoo defaultKeyStatistics | > 10% | < 0% | 20% |

**Score → Label:**
- 70–100 → 🟢 GREEN ("Fundamentally healthy")
- 40–69 → 🟡 YELLOW ("Mixed fundamentals")
- 0–39 → 🔴 RED ("Weak fundamentals")

---

## Ticker Convention

All tickers use Yahoo Finance NSE format: `SYMBOL.NS`

| Input | Stored as |
|---|---|
| RELIANCE | RELIANCE.NS |
| TCS | TCS.NS |
| NIFTY50 index | ^NSEI |
| SENSEX | ^BSESN |
| NIFTY BANK | ^NSEBANK |

Zerodha CSV importer auto-appends `.NS` to all equity symbols.

---

## Caching Strategy

| Data | Cache TTL | Rationale |
|---|---|---|
| Live quotes | 60 seconds | Balance freshness vs rate limits |
| OHLCV chart data | 5 minutes | Candles don't change intraday at 1d interval |
| Signal scores | 15 minutes | Indicator-heavy computation |
| Fundamentals | 24 hours | Quarterly data, rarely changes |
| Market header (NIFTY/SENSEX) | 30 seconds | Higher priority freshness |

Caching handled at the TanStack Query layer on the client. Server-side: Next.js `revalidate` for static segments.

---

## Deployment

### Local
```bash
npm run dev    # http://localhost:3000
```

### Docker
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data   # SQLite persistence
```

### Future: Vercel + Turso
If remote access is needed: migrate SQLite to Turso (libSQL) with a single connection string change in `lib/db.ts`. Zero other changes required — Turso is SQLite-compatible.
