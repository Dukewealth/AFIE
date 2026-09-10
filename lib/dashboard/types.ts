import type { AuditLog, Json, Transaction } from "@/lib/db/database.types";

export type TransactionStatus = "ALLOWED" | "CHALLENGED" | "BLOCKED";

export type ThreatLevel = "Low" | "Elevated" | "High";

export type LiveConnectionState = "connecting" | "live" | "offline" | "demo";

export type DashboardTransaction = Transaction;

export interface DashboardKpis {
  totalEvaluated24h: number;
  blockedCount24h: number;
  challengedCount24h: number;
  blockRate: number;
  averageLatencyMs: number;
  threatLevel: ThreatLevel;
}

export interface DashboardSnapshot {
  transactions: DashboardTransaction[];
  kpis: DashboardKpis;
  mode: "live" | "demo";
}

export interface ForensicPayload {
  transaction: DashboardTransaction;
  auditLogs: AuditLog[];
  triggeredRules: string[];
  forensicReason: string | null;
  rawAudit: Json;
}

export interface DashboardClientProps {
  initialTransactions: DashboardTransaction[];
  initialKpis: DashboardKpis;
  mode: "live" | "demo";
}
