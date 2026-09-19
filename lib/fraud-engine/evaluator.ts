import type { Json } from "@/lib/db/database.types";
import { isSupabaseConfigured } from "@/lib/dashboard/config";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import {
  evaluateForensicAgent,
  type AgentEvaluationOutcome,
} from "@/lib/fraud-engine/agent";
import {
  evaluateHeuristics,
  type HeuristicEvaluationResult,
} from "@/lib/fraud-engine/heuristics";
import {
  actionToStatus,
  type EvaluationResult,
  type TransactionPayload,
} from "@/lib/fraud-engine/types";
import { recordLocalEvaluation } from "@/lib/store/local";

export interface EvaluateOptions {
  merchantId: string;
}

export async function evaluateTransaction(
  payload: TransactionPayload,
  options: EvaluateOptions,
): Promise<EvaluationResult> {
  const start = performance.now();
  const heuristicResult = await evaluateHeuristics(payload, {
    merchantId: options.merchantId,
  });

  let agentOutcome: AgentEvaluationOutcome | null = null;
  let action = heuristicResult.action;
  let riskScore = heuristicResult.score;
  let reasons = [...heuristicResult.reasons];

  if (heuristicResult.status === "FLAGGED") {
    agentOutcome = await evaluateForensicAgent(payload, heuristicResult);
    if (agentOutcome.source === "AI_AGENT") {
      action = agentOutcome.action;
      riskScore = agentOutcome.risk_score;
      reasons = [agentOutcome.reason, ...heuristicResult.reasons];
    }
  }

  // Hard product rule: never BLOCK transactions under $1,000
  if (payload.amount < 1_000 && action === "BLOCK") {
    action = "CHALLENGE";
    riskScore = Math.min(riskScore, 69);
    reasons = [
      "Under $1,000 protection — payment cannot be halted; step-up challenge required",
      ...reasons,
    ];
  }

  const latencyMs = Math.round(performance.now() - start);
  const timestamp = new Date().toISOString();

  const result: EvaluationResult = {
    action,
    risk_score: riskScore,
    reasons,
    latency_ms: latencyMs,
    timestamp,
  };

  await persistEvaluation(
    payload,
    options.merchantId,
    result,
    heuristicResult,
    agentOutcome,
  ).catch((err) => {
    console.error("[AFIE] Failed to persist evaluation:", err);
  });

  return result;
}

async function persistEvaluation(
  payload: TransactionPayload,
  merchantId: string,
  result: EvaluationResult,
  heuristicResult: HeuristicEvaluationResult,
  agentOutcome: AgentEvaluationOutcome | null,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    recordLocalEvaluation(payload, merchantId, result, heuristicResult, agentOutcome);
    return;
  }

  const supabase = createServerSupabaseClient();

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
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
    })
    .select("id")
    .single();

  if (txError) throw txError;

  const heuristicAudit: Json = {
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
    requires_ai_agent: heuristicResult.status === "FLAGGED",
    metadata: JSON.parse(JSON.stringify(payload.metadata)) as Json,
  };

  await supabase.from("audit_logs").insert({
    transaction_id: transaction.id,
    stage: "HEURISTIC",
    details: heuristicAudit,
  });

  if (agentOutcome) {
    const agentAudit: Json = {
      source: agentOutcome.source,
      action: agentOutcome.action,
      risk_score: agentOutcome.risk_score,
      reason: agentOutcome.reason,
      agent_latency_ms: agentOutcome.agent_latency_ms ?? null,
      fallback_reason: agentOutcome.fallback_reason ?? null,
      final_action: result.action,
      final_risk_score: result.risk_score,
    };

    await supabase.from("audit_logs").insert({
      transaction_id: transaction.id,
      stage: "AI_AGENT",
      details: agentAudit,
    });
  }

  await supabase.from("audit_logs").insert({
    transaction_id: transaction.id,
    stage: "FINAL_DISPATCH",
    details: {
      action: result.action,
      risk_score: result.risk_score,
      reasons: result.reasons,
      latency_ms: result.latency_ms,
      evaluation_path:
        agentOutcome?.source === "AI_AGENT"
          ? "HEURISTIC_THEN_AI"
          : agentOutcome?.source === "HEURISTIC_FALLBACK"
            ? "HEURISTIC_THEN_FALLBACK"
            : "HEURISTIC_ONLY",
    } satisfies Json,
  });
}
