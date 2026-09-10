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
const VELOCITY_3M_THRESHOLD = 3;
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
} as const;

export async function evaluateHeuristics(
  payload: TransactionPayload,
  redis: TypedRedisClient = createRedisClient(),
): Promise<HeuristicEvaluationResult> {
  try {
    return await evaluateWithRedis(payload, redis);
  } catch (error) {
    console.error("[AFIE] Heuristic Redis failure, degrading to local rules:", error);
    return buildResult(runLocalAnomalyHeuristics(payload), emptyVelocityStats());
  }
}

async function evaluateWithRedis(
  payload: TransactionPayload,
  redis: TypedRedisClient,
): Promise<HeuristicEvaluationResult> {
  const now = Date.now();
  const cutoff3m = now - WINDOW_3M_MS;
  const cutoff1h = now - WINDOW_1H_MS;
  const member = `${now}:${payload.transaction_id}`;

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

  const results = await pipeline.exec();
  if (!results) {
    throw new Error("Redis pipeline returned no results");
  }

  const userCount3m = readVelocityCount(results, 0);
  const userCount1h = readVelocityCount(results, 1);
  const deviceCount3m = readVelocityCount(results, 2);
  const deviceCount1h = readVelocityCount(results, 3);

  const signals: RuleSignal[] = [];
  signals.push(...checkBlacklistResults(results[16], results[17], payload));
  signals.push(...checkVelocity3m(userCount3m, deviceCount3m));
  signals.push(...checkAnomalyHeuristics(payload, readUserStats(results[18])));

  return buildResult(signals, {
    userCount3m,
    userCount1h,
    deviceCount3m,
    deviceCount1h,
  });
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

function checkVelocity3m(userCount: number, deviceCount: number): RuleSignal[] {
  const signals: RuleSignal[] = [];
  if (userCount > VELOCITY_3M_THRESHOLD) {
    signals.push({
      rule: RULE.VELOCITY_USER_3M,
      score: 50,
      reason: `High velocity: ${userCount} user attempts in past 3 minutes`,
    });
  }
  if (deviceCount > VELOCITY_3M_THRESHOLD) {
    signals.push({
      rule: RULE.VELOCITY_DEVICE_3M,
      score: 45,
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

function buildResult(
  signals: RuleSignal[],
  velocityStats: VelocityStats = emptyVelocityStats(),
): HeuristicEvaluationResult {
  const score = Math.min(100, signals.reduce((total, s) => total + s.score, 0));
  const status = scoreToStatus(score);
  return {
    score,
    triggeredRules: signals.map((s) => s.rule),
    status,
    action: statusToAction(status),
    reasons: signals.map((s) => s.reason),
    velocityStats,
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
