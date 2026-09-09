import { Redis } from "@upstash/redis";

export type TypedRedisClient = Redis;

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
 * Singleton Upstash Redis REST client for velocity checks and blacklist lookups.
 */
export function createRedisClient(): TypedRedisClient {
  if (!redisClient) {
    redisClient = new Redis({
      url: getRedisUrl(),
      token: getRedisToken(),
    });
  }
  return redisClient;
}

/** Redis key prefixes used by the fraud engine. */
export const RedisKeys = {
  velocity: (userId: string, window: "5m" | "1h" | "24h") =>
    `velocity:${userId}:${window}`,
  blacklistIp: (ip: string) => `blacklist:ip:${ip}`,
  blacklistDevice: (fingerprint: string) => `blacklist:device:${fingerprint}`,
  whitelistIp: (ip: string) => `whitelist:ip:${ip}`,
  whitelistDevice: (fingerprint: string) => `whitelist:device:${fingerprint}`,
} as const;
