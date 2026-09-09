import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { createRedisClient, RedisKeys } from "@/lib/redis/upstash";
import {
  actionToStatus,
  riskScoreToAction,
  type EvaluationResult,
  type TransactionPayload,
} from "@/lib/fraud-engine/types";

export interface EvaluateOptions {
  merchantId: string;
}

interface HeuristicSignal {
  score: number;
  reason: string;
}

/**
 * Deterministic fast-path fraud evaluator.
 * Performs Redis lookups and heuristic scoring before AI escalation (future step).
 */
export async function evaluateTransaction(
  payload: TransactionPayload,
  options: EvaluateOptions,
): Promise<EvaluationResult> {
  const start = performance.now();
  const redis = createRedisClient();
  const reasons: string[] = [];
  let riskScore = 0;

  const signals = await Promise.all([
    checkBlacklist(redis, payload),
    checkVelocity(redis, payload),
    checkMetadataHeuristics(payload),
    checkAmountHeuristics(payload),
  ]);

  for (const signalList of signals) {
    for (const signal of signalList) {
      riskScore = Math.min(100, riskScore + signal.score);
      reasons.push(signal.reason);
    }
  }

  const action = riskScoreToAction(riskScore);
  const latencyMs = Math.round(performance.now() - start);
  const timestamp = new Date().toISOString();

  const result: EvaluationResult = {
    action,
    risk_score: riskScore,
    reasons,
    latency_ms: latencyMs,
    timestamp,
  };

  await persistEvaluation(payload, options.merchantId, result).catch((err) => {
    console.error("[AFIE] Failed to persist evaluation:", err);
  });

  return result;
}

async function checkBlacklist(
  redis: ReturnType<typeof createRedisClient>,
  payload: TransactionPayload,
): Promise<HeuristicSignal[]> {
  const signals: HeuristicSignal[] = [];

  const [ipBlocked, deviceBlocked] = await Promise.all([
    redis.get<boolean>(RedisKeys.blacklistIp(payload.ip_address)),
    redis.get<boolean>(RedisKeys.blacklistDevice(payload.device_fingerprint)),
  ]);

  if (ipBlocked) {
    signals.push({ score: 80, reason: `Blacklisted IP: ${payload.ip_address}` });
  }

  if (deviceBlocked) {
    signals.push({
      score: 75,
      reason: `Blacklisted device fingerprint: ${payload.device_fingerprint}`,
    });
  }

  return signals;
}

async function checkVelocity(
  redis: ReturnType<typeof createRedisClient>,
  payload: TransactionPayload,
): Promise<HeuristicSignal[]> {
  const signals: HeuristicSignal[] = [];
  const key = RedisKeys.velocity(payload.user_id, "5m");

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 300);
  }

  if (count >= 4) {
    signals.push({
      score: 45,
      reason: `High velocity: ${count} attempts in past 5 minutes`,
    });
  } else if (count >= 2) {
    signals.push({
      score: 20,
      reason: `Elevated velocity: ${count} attempts in past 5 minutes`,
    });
  }

  return signals;
}

function checkMetadataHeuristics(
  payload: TransactionPayload,
): HeuristicSignal[] {
  const signals: HeuristicSignal[] = [];
  const accountAgeDays = payload.metadata.account_age_days;

  if (typeof accountAgeDays === "number" && accountAgeDays < 7) {
    signals.push({
      score: 25,
      reason: "New account (< 7 days) with transaction activity",
    });
  }

  const previousTx = payload.metadata.previous_successful_tx;
  if (typeof previousTx === "number" && previousTx === 0 && payload.amount > 100) {
    signals.push({
      score: 30,
      reason: "First transaction with high transaction value",
    });
  }

  return signals;
}

function checkAmountHeuristics(payload: TransactionPayload): HeuristicSignal[] {
  const signals: HeuristicSignal[] = [];

  if (payload.amount >= 10_000) {
    signals.push({
      score: 35,
      reason: `High transaction amount: ${payload.amount} ${payload.currency}`,
    });
  }

  return signals;
}

async function persistEvaluation(
  payload: TransactionPayload,
  merchantId: string,
  result: EvaluationResult,
): Promise<void> {
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

  if (txError) {
    throw txError;
  }

  const auditDetails: Json = {
    action: result.action,
    risk_score: result.risk_score,
    reasons: result.reasons,
    metadata: JSON.parse(JSON.stringify(payload.metadata)) as Json,
  };

  await supabase.from("audit_logs").insert({
    transaction_id: transaction.id,
    stage: "HEURISTIC",
    details: auditDetails,
  });
}
