import type { DashboardKpis, DashboardTransaction, ThreatLevel } from "@/lib/dashboard/types";

const ELEVATED_BLOCK_RATE = 5;
const HIGH_BLOCK_RATE = 12;
const ELEVATED_CHALLENGE_RATE = 25;

export function computeThreatLevel(
  blockRate: number,
  challengeRate: number,
): ThreatLevel {
  if (blockRate >= HIGH_BLOCK_RATE) return "High";
  if (blockRate >= ELEVATED_BLOCK_RATE || challengeRate >= ELEVATED_CHALLENGE_RATE) {
    return "Elevated";
  }
  return "Low";
}

export function computeFraudVolumePrevented(
  rows: Pick<DashboardTransaction, "status" | "amount">[],
): number {
  return rows
    .filter((row) => row.status === "BLOCKED")
    .reduce((sum, row) => sum + (Number.isFinite(row.amount) ? Number(row.amount) : 0), 0);
}

export function computeKpisFromRows(
  rows: Pick<DashboardTransaction, "status" | "latency_ms" | "amount">[],
  totalOverride?: number,
): DashboardKpis {
  const totalEvaluated24h = totalOverride ?? rows.length;
  const blockedCount24h = rows.filter((row) => row.status === "BLOCKED").length;
  const challengedCount24h = rows.filter((row) => row.status === "CHALLENGED").length;

  const latencies = rows
    .map((row) => row.latency_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const averageLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : 0;

  const blockRate =
    totalEvaluated24h > 0
      ? Number(((blockedCount24h / totalEvaluated24h) * 100).toFixed(1))
      : 0;
  const challengeRate =
    totalEvaluated24h > 0 ? (challengedCount24h / totalEvaluated24h) * 100 : 0;

  return {
    totalEvaluated24h,
    blockedCount24h,
    challengedCount24h,
    blockRate,
    averageLatencyMs,
    threatLevel: computeThreatLevel(blockRate, challengeRate),
    fraudVolumePrevented: Number(computeFraudVolumePrevented(rows).toFixed(2)),
  };
}

export function applyLiveTransactionToKpis(
  kpis: DashboardKpis,
  transaction: DashboardTransaction,
): DashboardKpis {
  const createdAt = Date.parse(transaction.created_at);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    return kpis;
  }

  const totalEvaluated24h = kpis.totalEvaluated24h + 1;
  const blockedCount24h =
    kpis.blockedCount24h + (transaction.status === "BLOCKED" ? 1 : 0);
  const challengedCount24h =
    kpis.challengedCount24h + (transaction.status === "CHALLENGED" ? 1 : 0);

  let averageLatencyMs = kpis.averageLatencyMs;
  if (typeof transaction.latency_ms === "number" && Number.isFinite(transaction.latency_ms)) {
    const previousTotal = Math.max(kpis.totalEvaluated24h, 0);
    averageLatencyMs = Math.round(
      (kpis.averageLatencyMs * previousTotal + transaction.latency_ms) / totalEvaluated24h,
    );
  }

  const blockRate = Number(((blockedCount24h / totalEvaluated24h) * 100).toFixed(1));
  const challengeRate = (challengedCount24h / totalEvaluated24h) * 100;
  const fraudVolumePrevented =
    transaction.status === "BLOCKED"
      ? Number((kpis.fraudVolumePrevented + Number(transaction.amount)).toFixed(2))
      : kpis.fraudVolumePrevented;

  return {
    totalEvaluated24h,
    blockedCount24h,
    challengedCount24h,
    blockRate,
    averageLatencyMs,
    threatLevel: computeThreatLevel(blockRate, challengeRate),
    fraudVolumePrevented,
  };
}

export function emptyKpis(): DashboardKpis {
  return {
    totalEvaluated24h: 0,
    blockedCount24h: 0,
    challengedCount24h: 0,
    blockRate: 0,
    averageLatencyMs: 0,
    threatLevel: "Low",
    fraudVolumePrevented: 0,
  };
}
