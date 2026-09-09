Autonomous Fraud Intelligence Engine (AFIE)
Technical Specifications & System Architecture Reference
1. Product Requirements Document (PRD)
The Autonomous Fraud Intelligence Engine (AFIE) is designed to provide a sub-200ms autonomous fraud evaluation engine alongside a live risk operations dashboard. It serves modern fintechs, payment gateways, and digital financial platforms requiring rapid, intelligent decisioning.

Autonomous Decision Model

ALLOW: Transaction cleared for immediate processing (Risk Score 0–29).
CHALLENGE: Intermediate risk; trigger secondary verification/OTP (Risk Score 30–69).
BLOCK: High-risk or malicious attack vector; reject immediately (Risk Score 70–100).

Latency & Performance SLAs

Deterministic Fast Path: Heuristics and Redis lookups completed in under 30ms.
Full AI Forensic Path: Ambiguous anomalies evaluated by LLM completed in under 500ms.
System Availability: 99.9% uptime with graceful degradation. The system fails-safe to deterministic scoring if external LLMs experience a timeout.
2. System Architecture & Data Flow
The architecture utilizes an Edge API handler to manage requests, filtering them through a high-speed cache before escalating ambiguous cases to an agentic AI layer.[Client / Merchant App]

         │

         ▼ POST /api/v1/evaluate (Bearer API_KEY)

┌────────────────────────────────────────────────────────┐

│ Edge API Handler (Next.js / TypeScript Route Handler)  │

│ 1. Validate API Key & Merchant Rate Limit              │

│ 2. Validate payload structure using Zod schema         │

└───────────────────────────┬────────────────────────────┘

                            │

                            ▼

┌────────────────────────────────────────────────────────┐

│ Fast Filter & Feature Extraction Engine                │

│ - Redis sliding-window check (Velocity: 5m, 1h, 24h)   │

│ - Instant Blacklist / Whitelist lookup (IP, Device)    │

│ - Amount deviation vs. historical user baseline        │

└───────────────────────────┬────────────────────────────┘

                            │

              ┌─────────────┴─────────────┐

              ▼                           ▼

      Clear Normal/Known Bad      Ambiguous Flagged

      [Instant Verdict]           [Agentic Forensic Eval]

              │                           │

              │                           ▼

              │                   ┌───────────────────────────────┐

              │                   │ AI Forensic Agent (Claude/LLM)│

              │                   │ Inputs: Context, Rules, Stats │

              │                   │ Output: Structured Risk JSON  │

              │                   └───────────────┬───────────────┘

              │                                   │

              └───────────────────┬───────────────┘

                                  ▼

┌────────────────────────────────────────────────────────┐

│ Persistence & Realtime Broadcast                       │

│ 1. Return immediate JSON response to client            │

│ 2. Persist transaction, scores & audit logs to Supabase│

│ 3. Broadcast event via Supabase Realtime to Dashboard  │

└────────────────────────────────────────────────────────┘
3. Database Schema (PostgreSQL / Supabase DDL)
The data layer is built on PostgreSQL, utilizing the vector extension for fraud pattern matching and standard relational tables for transaction tracking and risk configuration.-- Extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Merchants Table

CREATE TABLE merchants (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,

    api_key TEXT UNIQUE NOT NULL,

    webhook_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- 2. Transactions Table

CREATE TABLE transactions (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,

    external_tx_id TEXT NOT NULL,

    user_id TEXT NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,

    currency VARCHAR(3) DEFAULT 'USD',

    payment_method VARCHAR(30) NOT NULL, -- card, momo, bank_transfer

    ip_address INET,

    device_fingerprint TEXT,

    country_code VARCHAR(2),

    status VARCHAR(20) NOT NULL, -- ALLOWED, CHALLENGED, BLOCKED

    risk_score INT NOT NULL, -- 0 to 100

    decision_reason TEXT,

    latency_ms INT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

CREATE INDEX idx_tx_user_id ON transactions(user_id);

CREATE INDEX idx_tx_merchant_created ON transactions(merchant_id, created_at DESC);

CREATE INDEX idx_tx_status ON transactions(status);

-- 3. Risk Rules Configuration

CREATE TABLE risk_rules (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    rule_type VARCHAR(50) NOT NULL, -- VELOCITY, AMOUNT_THRESHOLD, GEO_DISTANCE, BLACKLIST

    parameters JSONB NOT NULL,

    action VARCHAR(20) NOT NULL, -- CHALLENGE, BLOCK, FLAG

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- 4. Fraud Vector Embeddings

CREATE TABLE fraud_patterns (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    pattern_name TEXT NOT NULL,

    description TEXT NOT NULL,

    embedding VECTOR(1536),

    severity VARCHAR(20) DEFAULT 'HIGH',

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- 5. Audit Trail Logs

CREATE TABLE audit_logs (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,

    stage VARCHAR(50) NOT NULL, -- HEURISTIC, AI_AGENT, FINAL_DISPATCH

    details JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);
4. API Specifications
Endpoint 1: Evaluate Transaction
Evaluates a transaction for potential fraud and returns an immediate verdict.

Route: POST /api/v1/evaluate
Headers: Authorization: Bearer <API_KEY>, Content-Type: application/json

Request Body{

  "transaction_id": "tx_8912401",

  "user_id": "usr_4021",

  "amount": 250.00,

  "currency": "USD",

  "payment_method": "card",

  "ip_address": "102.176.45.12",

  "device_fingerprint": "hash_dev_9918",

  "billing_country": "GH",

  "metadata": {

    "account_age_days": 3,

    "previous_successful_tx": 1

  }

}

Response (200 OK){

  "transaction_id": "tx_8912401",

  "action": "BLOCK",

  "risk_score": 88,

  "reasons": [

    "High velocity: 4 attempts in past 90 seconds",

    "New account (< 7 days) with high transaction value"

  ],

  "latency_ms": 58,

  "timestamp": "2026-09-08T16:00:00Z"

}
Endpoint 2: Fetch Recent Transactions
Retrieves a chronological list of evaluated transactions.

Route: GET /api/v1/transactions?limit=50
Headers: Authorization: Bearer <API_KEY>
Response: Array of transaction objects sorted chronologically descending.
5. Deployment & Configuration Checklist
Successful deployment requires the configuration of the following environmental variables and external services:

Environment Variables (.env.local)

Variable
Description
NEXT_PUBLIC_SUPABASE_URL
Endpoint for Supabase backend.
NEXT_PUBLIC_SUPABASE_ANON_KEY
Client-side access key for Supabase.
SUPABASE_SERVICE_ROLE_KEY
Privileged key for server-side operations.
UPSTASH_REDIS_REST_URL
URL for the Redis in-memory cache.
UPSTASH_REDIS_REST_TOKEN
Auth token for Redis access.
ANTHROPIC_API_KEY
API key for Claude (or Google Gemini API Key).


Service Infrastructure

Front-end & API: Hosted on Vercel.
Database & Realtime: Managed via Supabase.
In-Memory Cache: Powered by Upstash Redis.

