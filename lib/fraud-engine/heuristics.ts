import { createRedisClient, RedisKeys, type TypedRedisClient } from "@/lib/redis/upstash";
import type { FraudAction, TransactionPayload } from "@/lib/fraud-engine/types";

export type HeuristicStatus = "CLEAR" | "FLAGGED" | "CRITICAL";

export interface VelocityStats {
  userCount3m: number;
  userCount1h: number;
  deviceCount3m: number;
  deviceCount1h: number;
}

export interface HeuristicEvaluationResult {
  score: number;
  triggeredRules: string[];
  status: HeuristicStatus;
  action: FraudAction;
  reasons: string[];
  velocityStats: VelocityStats;
  dailySpend?: number;
}

export interface HeuristicOptions {
  merchantId: string;
  redis?: TypedRedisClient;
}

interface RuleSignal {
  rule: string;
  score: number;
  reason: string;
}

const WINDOW_3M_MS = 3 * 60 * 1000;
const WINDOW_1H_MS = 60 * 60 * 1000;
const TTL_3M_SEC = 4 * 60;
const TTL_1H_SEC = 65 * 60;
const DAILY_SPEND_TTL_SEC = 24 * 60 * 60;

const VELOCITY_3M_THRESHOLD = 3;
const UNDER_THRESHOLD_AMOUNT = 1_000;
const DAILY_MERCHANT_CAP = 5_000;
const NEW_ACCOUNT_MAX_DAYS = 7;
const NEW_ACCOUNT_AMOUNT_THRESHOLD = 1_000;
const AVERAGE_MULTIPLIER = 5;

const RULE = {
  BLACKLIST_IP: "BLACKLIST_IP",
  BLACKLIST_DEVICE: "BLACKLIST_DEVICE",
  VELOCITY_USER_3M: "VELOCITY_USER_3M",
  VELOCITY_DEVICE_3M: "VELOCITY_DEVICE_3M",
  NEW_ACCOUNT_HIGH_AMOUNT: "NEW_ACCOUNT_HIGH_AMOUNT",
  AMOUNT_EXCEEDS_AVERAGE: "AMOUNT_EXCEEDS_AVERAGE",
  DAILY_SPEND_CAP: "DAILY_SPEND_CAP",
} as const;

const VELOCITY_RULES = new Set<string>([
  RULE.VELOCITY_USER_3M,
  RULE.VELOCITY_DEVICE_3M,
]);

const DEVICE_RISK_RULES = new Set<string>([
  RULE.BLACKLIST_IP,
  RULE.BLACKLIST_DEVICE,
]);

/**
 * Low-latency deterministic rule engine with financial guardrails:
 * A) Under $1,000: never BLOCK solely from velocity; device risk → CHALLENGE max
 * B) Cumulative $5,000 daily merchant/user spend → immediate BLOCK
 * C) Over $1,000: full velocity + anomaly scoring
 */
export async function evaluateHeuristics(
  payload: TransactionPayload,
  options: HeuristicOptions,
): Promise<HeuristicEvaluationResult> {
  const redis = options.redis ?? createRedisClient();

  try {
    return await evaluateWithRedis(payload, options.merchantId, redis);
  } catch (error) {
    console.error("[AFIE] Heuristic Redis failure, degrading to local rules:", error);
    return finalizeResult(
      payload,
      runLocalAnomalyHeuristics(payload),
      emptyVelocityStats(),
      0,
    );
  }
}

async function evaluateWithRedis(
  payload: TransactionPayload,
  merchantId: string,
  redis: TypedRedisClient,
): Promise<HeuristicEvaluationResult> {
  const now = Date.now();
  const cutoff3m = now - WINDOW_3M_MS;
  const cutoff1h = now - WINDOW_1H_MS;
  const member = `${now}:${payload.transaction_id}`;
  const spendKey = RedisKeys.dailySpend(merchantId, payload.user_id);

  const pipeline = redis.pipeline();

  appendVelocityWindow(
    pipeline,
    RedisKeys.velocityUser(payload.user_id, "3m"),
    member,
    now,
    cutoff3m,
    TTL_3M_SEC,
  );
  appendVelocityWindow(
    pipeline,
    RedisKeys.velocityUser(payload.user_id, "1h"),
    member,
    now,
    cutoff1h,
    TTL_1H_SEC,
  );
  appendVelocityWindow(
    pipeline,
    RedisKeys.velocityDevice(payload.device_fingerprint, "3m"),
    member,
    now,
    cutoff3m,
    TTL_3M_SEC,
  );
  appendVelocityWindow(
    pipeline,
    RedisKeys.velocityDevice(payload.device_fingerprint, "1h"),
    member,
    now,
    cutoff1h,
    TTL_1H_SEC,
  );

  pipeline.sismember(RedisKeys.blacklistIdentifiers, payload.ip_address);
  pipeline.sismember(RedisKeys.blacklistIdentifiers, payload.device_fingerprint);
  pipeline.hmget(RedisKeys.userStats(payload.user_id), "sum", "count");
  pipeline.hincrbyfloat(RedisKeys.userStats(payload.user_id), "sum", payload.amount);
  pipeline.hincrby(RedisKeys.userStats(payload.user_id), "count", 1);
  pipeline.incrbyfloat(spendKey, payload.amount);
  pipeline.expire(spendKey, DAILY_SPEND_TTL_SEC);

  const results = await pipeline.exec();
  if (!results) {
    throw new Error("Redis pipeline returned no results");
  }

  const userCount3m = readVelocityCount(results, 0);
  const userCount1h = readVelocityCount(results, 1);
  const deviceCount3m = readVelocityCount(results, 2);
  const deviceCount1h = readVelocityCount(results, 3);
  const dailySpend = parseStatNumber(results[21]);

  const signals: RuleSignal[] = [];
  signals.push(...checkBlacklistResults(results[16], results[17], payload));

  // Rule C: full velocity for >= $1,000; Rule A softens under $1,000 later
  signals.push(...checkVelocity3m(userCount3m, deviceCount3m, payload.amount));
  signals.push(...checkAnomalyHeuristics(payload, readUserStats(results[18])));
  signals.push(...checkDailySpendCap(dailySpend));

  return finalizeResult(
    payload,
    signals,
    { userCount3m, userCount1h, deviceCount3m, deviceCount1h },
    dailySpend,
  );
}

function appendVelocityWindow(
  pipeline: ReturnType<TypedRedisClient["pipeline"]>,
  key: string,
  member: string,
  now: number,
  cutoff: number,
  ttlSeconds: number,
): void {
  pipeline.zremrangebyscore(key, 0, cutoff);
  pipeline.zadd(key, { score: now, member });
  pipeline.zcard(key);
  pipeline.expire(key, ttlSeconds);
}

function readVelocityCount(results: unknown[], windowIndex: number): number {
  const zcardResult = results[windowIndex * 4 + 2];
  return typeof zcardResult === "number" ? zcardResult : 0;
}

function readUserStats(result: unknown): { sum: number; count: number } {
  if (!Array.isArray(result) || result.length < 2) {
    return { sum: 0, count: 0 };
  }
  return {
    sum: parseStatNumber(result[0]),
    count: parseStatNumber(result[1]),
  };
}

function parseStatNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function checkBlacklistResults(
  ipResult: unknown,
  deviceResult: unknown,
  payload: TransactionPayload,
): RuleSignal[] {
  const signals: RuleSignal[] = [];
  if (ipResult === 1 || ipResult === true) {
    signals.push({
      rule: RULE.BLACKLIST_IP,
      score: 90,
      reason: `Blacklisted IP: ${payload.ip_address}`,
    });
  }
  if (deviceResult === 1 || deviceResult === true) {
    signals.push({
      rule: RULE.BLACKLIST_DEVICE,
      score: 90,
      reason: `Blacklisted device fingerprint: ${payload.device_fingerprint}`,
    });
  }
  return signals;
}

function checkVelocity3m(
  userCount: number,
  deviceCount: number,
  amount: number,
): RuleSignal[] {
  const signals: RuleSignal[] = [];
  const underThreshold = amount < UNDER_THRESHOLD_AMOUNT;

  if (userCount > VELOCITY_3M_THRESHOLD) {
    signals.push({
      rule: RULE.VELOCITY_USER_3M,
      score: underThreshold ? 35 : 50,
      reason: `High velocity: ${userCount} user attempts in past 3 minutes`,
    });
  }
  if (deviceCount > VELOCITY_3M_THRESHOLD) {
    signals.push({
      rule: RULE.VELOCITY_DEVICE_3M,
      score: underThreshold ? 30 : 45,
      reason: `High velocity: ${deviceCount} device attempts in past 3 minutes`,
    });
  }
  return signals;
}

function checkAnomalyHeuristics(
  payload: TransactionPayload,
  stats: { sum: number; count: number },
): RuleSignal[] {
  const signals: RuleSignal[] = [];
  const accountAgeDays = payload.metadata.account_age_days;

  if (
    typeof accountAgeDays === "number" &&
    accountAgeDays < NEW_ACCOUNT_MAX_DAYS &&
    payload.amount > NEW_ACCOUNT_AMOUNT_THRESHOLD
  ) {
    signals.push({
      rule: RULE.NEW_ACCOUNT_HIGH_AMOUNT,
      score: 55,
      reason: `New account (< ${NEW_ACCOUNT_MAX_DAYS} days) with high transaction value: ${payload.amount} ${payload.currency}`,
    });
  }

  const historicalAverage = resolveHistoricalAverage(payload, stats);
  if (historicalAverage > 0 && payload.amount > historicalAverage * AVERAGE_MULTIPLIER) {
    signals.push({
      rule: RULE.AMOUNT_EXCEEDS_AVERAGE,
      score: 40,
      reason: `Amount ${payload.amount} ${payload.currency} exceeds ${AVERAGE_MULTIPLIER}x historical average (${historicalAverage.toFixed(2)})`,
    });
  }

  return signals;
}

function checkDailySpendCap(dailySpend: number): RuleSignal[] {
  if (dailySpend <= DAILY_MERCHANT_CAP) return [];

  return [
    {
      rule: RULE.DAILY_SPEND_CAP,
      score: 95,
      reason:
        "Exceeded cumulative daily merchant limit ($5,000 threshold breached via repetitive transactions)",
    },
  ];
}

function resolveHistoricalAverage(
  payload: TransactionPayload,
  stats: { sum: number; count: number },
): number {
  if (stats.count > 0) return stats.sum / stats.count;
  const metadataAvg = payload.metadata.historical_avg_amount;
  if (typeof metadataAvg === "number" && metadataAvg > 0) return metadataAvg;
  return 0;
}

function runLocalAnomalyHeuristics(payload: TransactionPayload): RuleSignal[] {
  const metadataAvg = payload.metadata.historical_avg_amount;
  const stats =
    typeof metadataAvg === "number" && metadataAvg > 0
      ? { sum: metadataAvg, count: 1 }
      : { sum: 0, count: 0 };
  return checkAnomalyHeuristics(payload, stats);
}

function emptyVelocityStats(): VelocityStats {
  return { userCount3m: 0, userCount1h: 0, deviceCount3m: 0, deviceCount1h: 0 };
}

/**
 * Hard rule: amounts under $1,000 are never BLOCKED — any fault maxes at CHALLENGE (OTP).
 * Daily spend cap still flags the case but cannot halt sub-$1k payments.
 */
function applyUnderThresholdGuardrails(
  amount: number,
  signals: RuleSignal[],
): RuleSignal[] {
  if (amount >= UNDER_THRESHOLD_AMOUNT) return signals;

  return signals.map((signal) => {
    if (signal.rule === RULE.DAILY_SPEND_CAP) {
      return {
        ...signal,
        score: 65,
        reason: `${signal.reason} (under $1,000 — challenge only, funds not halted)`,
      };
    }
    if (VELOCITY_RULES.has(signal.rule)) {
      return { ...signal, score: Math.min(signal.score, 40) };
    }
    if (DEVICE_RISK_RULES.has(signal.rule)) {
      return {
        ...signal,
        score: 55,
        reason: `${signal.reason} (under $1,000 — OTP challenge only)`,
      };
    }
    return { ...signal, score: Math.min(signal.score, 65) };
  });
}

function finalizeResult(
  payload: TransactionPayload,
  rawSignals: RuleSignal[],
  velocityStats: VelocityStats,
  dailySpend: number,
): HeuristicEvaluationResult {
  const signals = applyUnderThresholdGuardrails(payload.amount, rawSignals);
  let score = Math.min(100, signals.reduce((total, s) => total + s.score, 0));
  let status = scoreToStatus(score);

  // Absolute hard stop: never CRITICAL / BLOCK below $1,000 regardless of fault
  if (payload.amount < UNDER_THRESHOLD_AMOUNT && status === "CRITICAL") {
    status = "FLAGGED";
    score = Math.min(score, 69);
  }

  return {
    score,
    triggeredRules: signals.map((s) => s.rule),
    status,
    action: statusToAction(status),
    reasons: signals.map((s) => s.reason),
    velocityStats,
    dailySpend,
  };
}

export function scoreToStatus(score: number): HeuristicStatus {
  if (score < 30) return "CLEAR";
  if (score >= 70) return "CRITICAL";
  return "FLAGGED";
}

export function statusToAction(status: HeuristicStatus): FraudAction {
  switch (status) {
    case "CLEAR":
      return "ALLOW";
    case "CRITICAL":
      return "BLOCK";
    case "FLAGGED":
      return "CHALLENGE";
  }
}
