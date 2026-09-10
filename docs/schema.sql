-- AFIE Supabase schema (run in Supabase SQL Editor)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  external_tx_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(30) NOT NULL,
  ip_address INET,
  device_fingerprint TEXT,
  country_code VARCHAR(2),
  status VARCHAR(20) NOT NULL,
  risk_score INT NOT NULL,
  decision_reason TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_merchant_created ON transactions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on transactions for the live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Seed a development merchant (replace api_key with your MERCHANT_API_KEY)
INSERT INTO merchants (name, api_key)
VALUES ('Development Merchant', 'afie_test_secret_key_12345')
ON CONFLICT (api_key) DO NOTHING;
