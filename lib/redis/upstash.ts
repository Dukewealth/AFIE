import { Redis } from "@upstash/redis";
import { isRedisConfigured } from "@/lib/dashboard/config";
import { MemoryRedis, seedLocalBlacklist } from "@/lib/redis/memory";

export type TypedRedisClient = Redis | MemoryRedis;

function getRedisUrl(): string {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL. Set it in .env.local or your deployment environment.",
    );
  }
  return url;
}

function getRedisToken(): string {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_TOKEN. Set it in .env.local or your deployment environment.",
    );
  }
  return token;
}

let redisClient: TypedRedisClient | null = null;

/**
 * Redis client for velocity checks and blacklist lookups.
 * Falls back to an in-memory store when Upstash is not configured.
 */
export function createRedisClient(): TypedRedisClient {
  if (redisClient) {
    return redisClient;
  }

  if (!isRedisConfigured()) {
    console.warn("[AFIE] Upstash not configured — using in-memory Redis for local dev.");
    const memory = new MemoryRedis();
    seedLocalBlacklist(memory);
    redisClient = memory;
    return redisClient;
  }

  redisClient = new Redis({
    url: getRedisUrl(),
    token: getRedisToken(),
  });

  return redisClient;
}

/** Redis key prefixes used by the fraud engine. */
export const RedisKeys = {
  velocityUser: (userId: string, window: "3m" | "1h") =>
    `velocity:user:${userId}:${window}`,
  velocityDevice: (fingerprint: string, window: "3m" | "1h") =>
    `velocity:device:${fingerprint}:${window}`,
  blacklistIdentifiers: "blacklist:identifiers",
  userStats: (userId: string) => `user:stats:${userId}`,
  whitelistIp: (ip: string) => `whitelist:ip:${ip}`,
  whitelistDevice: (fingerprint: string) => `whitelist:device:${fingerprint}`,
} as const;
