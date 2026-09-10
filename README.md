# AFIE — Autonomous Fraud Intelligence Engine

Autonomous fraud evaluation API with deterministic heuristics, optional AI forensic escalation, and a live risk operations dashboard.

## Quick start (works immediately, no cloud setup)

```bash
npm install
npm run dev:demo
```

This starts:
- **API + Dashboard** at http://localhost:3000
- **Traffic simulator** sending synthetic payments every 1–2 seconds

Open **http://localhost:3000/dashboard** — you'll see transactions appear live as they're evaluated.

### Manual start (two terminals)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run simulate
```

## What runs locally without cloud credentials

| Feature | Local fallback |
|---------|----------------|
| Merchant auth | `MERCHANT_API_KEY` from `.env.local` |
| Redis velocity/blacklist | In-memory Redis (auto-seeded blacklist) |
| Supabase persistence | In-memory store + dashboard polling |
| AI forensic agent | Heuristic fallback for FLAGGED cases |
| Dashboard | Demo seed → live local evaluations |

Copy `.env.example` to `.env.local` — defaults already work for local dev.

## API

### Evaluate a transaction

```http
POST /api/v1/evaluate
Authorization: Bearer afie_test_secret_key_12345
Content-Type: application/json
```

```json
{
  "transaction_id": "tx_8912401",
  "user_id": "usr_4021",
  "amount": 250.0,
  "currency": "USD",
  "payment_method": "card",
  "ip_address": "102.176.45.12",
  "device_fingerprint": "hash_dev_9918",
  "billing_country": "GH",
  "metadata": { "account_age_days": 3, "previous_successful_tx": 1 }
}
```

**Response:** `action` (ALLOW / CHALLENGE / BLOCK), `risk_score`, `reasons`, `latency_ms`

### Fetch recent transactions (authenticated)

```http
GET /api/v1/transactions?limit=50
Authorization: Bearer afie_test_secret_key_12345
```

## Architecture

1. **Heuristics fast path** (< 30ms target) — Redis sliding-window velocity, blacklist, anomaly rules
2. **AI forensic agent** (FLAGGED only, 450ms timeout) — Claude evaluates borderline cases
3. **Dashboard** — KPIs, live transaction feed, forensic deep-dive drawer

## Production setup

1. Create a Supabase project and run [`docs/schema.sql`](docs/schema.sql)
2. Create an Upstash Redis instance
3. Add real keys to `.env.local` (see `.env.example`)
4. Optionally add `ANTHROPIC_API_KEY` for AI forensic path
5. Deploy to Vercel

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run simulate` | Send synthetic fraud traffic |
| `npm run dev:demo` | Dev server + simulator together |
| `npm run build` | Production build |

## Project structure

```
app/
  api/v1/evaluate/     # Fraud evaluation endpoint
  api/v1/transactions/ # Merchant transaction history
  api/dashboard/       # Dashboard snapshot + forensics
  dashboard/             # Operations console UI
lib/
  fraud-engine/        # Heuristics, AI agent, evaluator
  dashboard/           # KPIs, queries, formatting
  store/local.ts       # In-memory persistence for local dev
  redis/               # Upstash + in-memory fallback
scripts/
  simulate-traffic.ts  # Synthetic traffic generator
```
