import type { AuditLog, Json } from "@/lib/db/database.types";
import { computeKpisFromRows } from "@/lib/dashboard/metrics";
import { assembleForensics } from "@/lib/dashboard/forensics";
import type { DashboardSnapshot, DashboardTransaction } from "@/lib/dashboard/types";
import type { EvaluationResult, TransactionPayload } from "@/lib/fraud-engine/types";
import { actionToStatus } from "@/lib/fraud-engine/types";
import type { AgentEvaluationOutcome } from "@/lib/fraud-engine/agent";
import type { HeuristicEvaluationResult } from "@/lib/fraud-engine/heuristics";

const FEED_LIMIT = 75;

interface StoredEvaluation {
  transaction: DashboardTransaction;
  auditLogs: AuditLog[];
}

const store = new Map<string, StoredEvaluation>();
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `local-${Date.now()}-${idCounter}`;
}

export function recordLocalEvaluation(
  payload: TransactionPayload,
  merchantId: string,
  result: EvaluationResult,
  heuristicResult: HeuristicEvaluationResult,
  agentOutcome: AgentEvaluationOutcome | null,
): DashboardTransaction {
  const id = nextId();
  const now = new Date().toISOString();

  const transaction: DashboardTransaction = {
    id,
    merchant_id: merchantId,
    external_tx_id: payload.transaction_id,
    user_id: payload.user_id,
    amount: payload.amount,
    currency: payload.currency,
    payment_method: payload.payment_method,
    ip_address: payload.ip_address,
    device_fingerprint: payload.device_fingerprint,
    country_code: payload.billing_country,
    status: actionToStatus(result.action),
    risk_score: result.risk_score,
    decision_reason: result.reasons.join("; ") || null,
    latency_ms: result.latency_ms,
    created_at: now,
  };

  const auditLogs: AuditLog[] = [
    {
      id: `${id}-heuristic`,
      transaction_id: id,
      stage: "HEURISTIC",
      details: {
        action: heuristicResult.action,
        risk_score: heuristicResult.score,
        reasons: heuristicResult.reasons,
        heuristic_status: heuristicResult.status,
        triggered_rules: heuristicResult.triggeredRules,
        velocity_stats: {
          userCount3m: heuristicResult.velocityStats.userCount3m,
          userCount1h: heuristicResult.velocityStats.userCount1h,
          deviceCount3m: heuristicResult.velocityStats.deviceCount3m,
          deviceCount1h: heuristicResult.velocityStats.deviceCount1h,
        },
      } as Json,
      created_at: now,
    },
  ];

  if (agentOutcome) {
    auditLogs.push({
      id: `${id}-agent`,
      transaction_id: id,
      stage: "AI_AGENT",
      details: {
        source: agentOutcome.source,
        action: agentOutcome.action,
        risk_score: agentOutcome.risk_score,
        reason: agentOutcome.reason,
        agent_latency_ms: agentOutcome.agent_latency_ms ?? null,
        fallback_reason: agentOutcome.fallback_reason ?? null,
      } as Json,
      created_at: now,
    });
  }

  auditLogs.push({
    id: `${id}-final`,
    transaction_id: id,
    stage: "FINAL_DISPATCH",
    details: {
      action: result.action,
      risk_score: result.risk_score,
      reasons: result.reasons,
      latency_ms: result.latency_ms,
    } as Json,
    created_at: now,
  });

  store.set(id, { transaction, auditLogs });

  if (store.size > FEED_LIMIT * 2) {
    const oldest = [...store.keys()][0];
    if (oldest) store.delete(oldest);
  }

  return transaction;
}

export function getLocalSnapshot(): DashboardSnapshot {
  const transactions = [...store.values()]
    .map((entry) => entry.transaction)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, FEED_LIMIT);

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = transactions.filter((tx) => Date.parse(tx.created_at) >= since);

  return {
    transactions,
    kpis: computeKpisFromRows(recent.length > 0 ? recent : transactions),
    mode: "demo",
  };
}

export function getLocalForensics(transactionId: string) {
  const entry = store.get(transactionId);
  if (!entry) return null;
  return assembleForensics(entry.transaction, entry.auditLogs);
}

export function getLocalTransactions(limit: number): DashboardTransaction[] {
  return [...store.values()]
    .map((entry) => entry.transaction)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, Math.max(limit, 0));
}

export function hasLocalEvaluations(): boolean {
  return store.size > 0;
}
