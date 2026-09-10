import { computeKpisFromRows } from "@/lib/dashboard/metrics";
import type { DashboardSnapshot, DashboardTransaction } from "@/lib/dashboard/types";

const DEMO_TRANSACTIONS: DashboardTransaction[] = [
  {
    id: "demo-1",
    merchant_id: null,
    external_tx_id: "tx_98124",
    user_id: "usr_8821",
    amount: 1250,
    currency: "USD",
    payment_method: "card",
    ip_address: "102.176.45.12",
    device_fingerprint: "hash_dev_9918",
    country_code: "GH",
    status: "BLOCKED",
    risk_score: 94,
    decision_reason:
      "High velocity attack: 5 rapid authorization attempts within 60 seconds from same device fingerprint.",
    latency_ms: 54,
    created_at: new Date(Date.now() - 30_000).toISOString(),
  },
  {
    id: "demo-2",
    merchant_id: null,
    external_tx_id: "tx_98123",
    user_id: "usr_4401",
    amount: 450,
    currency: "USD",
    payment_method: "momo",
    ip_address: "154.160.22.8",
    device_fingerprint: "hash_dev_7721",
    country_code: "GH",
    status: "CHALLENGED",
    risk_score: 58,
    decision_reason:
      "Unusual amount deviation: Transaction is 4.2x above historical 30-day user median. Step-up OTP triggered.",
    latency_ms: 220,
    created_at: new Date(Date.now() - 90_000).toISOString(),
  },
  {
    id: "demo-3",
    merchant_id: null,
    external_tx_id: "tx_98122",
    user_id: "usr_1092",
    amount: 35,
    currency: "USD",
    payment_method: "card",
    ip_address: "197.251.14.90",
    device_fingerprint: "hash_dev_1102",
    country_code: "GH",
    status: "ALLOWED",
    risk_score: 12,
    decision_reason:
      "Legitimate transaction: Clean device reputation, standard velocity, consistent geolocation.",
    latency_ms: 18,
    created_at: new Date(Date.now() - 180_000).toISOString(),
  },
];

export function getDemoSnapshot(): DashboardSnapshot {
  return {
    transactions: DEMO_TRANSACTIONS,
    kpis: computeKpisFromRows(DEMO_TRANSACTIONS),
    mode: "demo",
  };
}
