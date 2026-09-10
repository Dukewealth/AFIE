import type { AuditLog, Json } from "@/lib/db/database.types";
import type { DashboardTransaction, ForensicPayload } from "@/lib/dashboard/types";

export function assembleForensics(
  transaction: DashboardTransaction,
  auditLogs: AuditLog[],
): ForensicPayload {
  const heuristicLog = auditLogs.find((log) => log.stage === "HEURISTIC");
  const agentLog = auditLogs.find((log) => log.stage === "AI_AGENT");

  return {
    transaction,
    auditLogs,
    triggeredRules: extractTriggeredRules(
      heuristicLog?.details,
      transaction.decision_reason,
    ),
    forensicReason: extractForensicReason(agentLog?.details, transaction.decision_reason),
    rawAudit: (auditLogs.length > 0
      ? auditLogs
      : { decision_reason: transaction.decision_reason }) as Json,
  };
}

function extractTriggeredRules(details: Json | undefined, fallback: string | null): string[] {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const rules = details.triggered_rules;
    if (Array.isArray(rules)) {
      return rules.filter((rule): rule is string => typeof rule === "string");
    }
  }

  if (!fallback) return [];
  return fallback
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractForensicReason(details: Json | undefined, fallback: string | null): string | null {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const reason = details.reason;
    if (typeof reason === "string" && reason.trim()) {
      return reason.trim();
    }
  }

  return fallback;
}
