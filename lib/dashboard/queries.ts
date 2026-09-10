import { createServerSupabaseClient } from "@/lib/db/supabase";
import { isSupabaseConfigured, withTimeout } from "@/lib/dashboard/config";
import { getDemoSnapshot } from "@/lib/dashboard/demo-data";
import { assembleForensics } from "@/lib/dashboard/forensics";
import { computeThreatLevel, emptyKpis } from "@/lib/dashboard/metrics";
import { normalizeTransaction } from "@/lib/dashboard/normalize";
import { getLocalForensics, getLocalSnapshot, hasLocalEvaluations } from "@/lib/store/local";
import type {
  DashboardSnapshot,
  ForensicPayload,
} from "@/lib/dashboard/types";

const FEED_LIMIT = 75;
const LATENCY_SAMPLE_LIMIT = 500;
const QUERY_TIMEOUT_MS = 2_500;

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    if (hasLocalEvaluations()) {
      return getLocalSnapshot();
    }
    return getDemoSnapshot();
  }

  return withTimeout(loadLiveSnapshot(), QUERY_TIMEOUT_MS, getLocalSnapshot());
}

async function loadLiveSnapshot(): Promise<DashboardSnapshot> {
  try {
    const supabase = createServerSupabaseClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [feedResult, countResult, blockedResult, challengedResult, latencyResult] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(FEED_LIMIT),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("status", "BLOCKED")
          .gte("created_at", since),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("status", "CHALLENGED")
          .gte("created_at", since),
        supabase
          .from("transactions")
          .select("status, latency_ms")
          .gte("created_at", since)
          .not("latency_ms", "is", null)
          .limit(LATENCY_SAMPLE_LIMIT),
      ]);

    if (feedResult.error) {
      throw feedResult.error;
    }

    const transactions = (feedResult.data ?? []).map(normalizeTransaction);
    const totalEvaluated24h = countResult.count ?? transactions.length;
    const blockedCount24h = blockedResult.count ?? 0;
    const challengedCount24h = challengedResult.count ?? 0;
    const latencies = (latencyResult.data ?? [])
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
      transactions,
      kpis: {
        totalEvaluated24h,
        blockedCount24h,
        challengedCount24h,
        blockRate,
        averageLatencyMs,
        threatLevel: computeThreatLevel(blockRate, challengeRate),
      },
      mode: "live",
    };
  } catch (error) {
    console.error("[AFIE] Failed to load dashboard snapshot:", error);
    return getDemoSnapshot();
  }
}

export async function fetchTransactionForensics(
  transactionId: string,
): Promise<ForensicPayload | null> {
  if (transactionId.startsWith("demo-")) {
    const demo = getDemoSnapshot();
    const transaction = demo.transactions.find((row) => row.id === transactionId);
    if (!transaction) return null;
    return assembleForensics(transaction, []);
  }

  if (!isSupabaseConfigured()) {
    return getLocalForensics(transactionId);
  }

  const supabase = createServerSupabaseClient();

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();

  if (txError) {
    throw txError;
  }

  if (!transaction) {
    return null;
  }

  const { data: auditLogs, error: auditError } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });

  if (auditError) {
    throw auditError;
  }

  return assembleForensics(normalizeTransaction(transaction), auditLogs ?? []);
}

export { emptyKpis };
