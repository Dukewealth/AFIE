type ZMember = { score: number; member: string };

/** In-memory Redis substitute for local development without Upstash. */
export class MemoryRedis {
  private readonly strings = new Map<string, { value: unknown; expiresAt?: number }>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly sortedSets = new Map<string, Map<string, number>>();
  private readonly hashes = new Map<string, Map<string, string>>();

  pipeline(): MemoryPipeline {
    return new MemoryPipeline(this);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.strings.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.strings.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, options?: { ex?: number }): Promise<"OK"> {
    const expiresAt =
      options?.ex !== undefined ? Date.now() + options.ex * 1000 : undefined;
    this.strings.set(key, { value, expiresAt });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key);
    const next = (typeof current === "number" ? current : 0) + 1;
    const entry = this.strings.get(key);
    this.strings.set(key, { value: next, expiresAt: entry?.expiresAt });
    return next;
  }

  async incrbyfloat(key: string, increment: number): Promise<number> {
    const current = await this.get<number | string>(key);
    const base =
      typeof current === "number"
        ? current
        : typeof current === "string"
          ? Number.parseFloat(current)
          : 0;
    const next = (Number.isFinite(base) ? base : 0) + increment;
    const entry = this.strings.get(key);
    this.strings.set(key, { value: next, expiresAt: entry?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const expiresAt = Date.now() + seconds * 1000;
    if (this.strings.has(key)) {
      const entry = this.strings.get(key)!;
      entry.expiresAt = expiresAt;
      this.strings.set(key, entry);
      return 1;
    }
    if (this.sortedSets.has(key)) {
      this.strings.set(`__ttl:${key}`, { value: true, expiresAt });
      return 1;
    }
    return 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added += 1;
      }
    }
    this.sets.set(key, set);
    return added;
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.sets.get(key)?.has(member) ? 1 : 0;
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    this.pruneExpiredSortedSet(key);
    const zset = this.sortedSets.get(key);
    if (!zset) return 0;
    let removed = 0;
    for (const [member, score] of zset.entries()) {
      if (score >= min && score <= max) {
        zset.delete(member);
        removed += 1;
      }
    }
    return removed;
  }

  async zadd(key: string, entry: ZMember): Promise<number> {
    this.pruneExpiredSortedSet(key);
    const zset = this.sortedSets.get(key) ?? new Map<string, number>();
    const isNew = !zset.has(entry.member);
    zset.set(entry.member, entry.score);
    this.sortedSets.set(key, zset);
    return isNew ? 1 : 0;
  }

  async zcard(key: string): Promise<number> {
    this.pruneExpiredSortedSet(key);
    return this.sortedSets.get(key)?.size ?? 0;
  }

  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    const hash = this.hashes.get(key);
    if (!hash) return fields.map(() => null);
    return fields.map((field) => hash.get(field) ?? null);
  }

  async hincrbyfloat(key: string, field: string, increment: number): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    const current = Number.parseFloat(hash.get(field) ?? "0");
    const next = current + increment;
    hash.set(field, String(next));
    this.hashes.set(key, hash);
    return next;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    const current = Number.parseInt(hash.get(field) ?? "0", 10);
    const next = current + increment;
    hash.set(field, String(next));
    this.hashes.set(key, hash);
    return next;
  }

  private pruneExpiredSortedSet(key: string): void {
    const ttl = this.strings.get(`__ttl:${key}`);
    if (ttl?.expiresAt && Date.now() > ttl.expiresAt) {
      this.sortedSets.delete(key);
      this.strings.delete(`__ttl:${key}`);
    }
  }
}

class MemoryPipeline {
  private readonly ops: Array<() => Promise<unknown>> = [];

  constructor(private readonly redis: MemoryRedis) {}

  zremrangebyscore(key: string, min: number, max: number): this {
    this.ops.push(() => this.redis.zremrangebyscore(key, min, max));
    return this;
  }

  zadd(key: string, entry: ZMember): this {
    this.ops.push(() => this.redis.zadd(key, entry));
    return this;
  }

  zcard(key: string): this {
    this.ops.push(() => this.redis.zcard(key));
    return this;
  }

  expire(key: string, seconds: number): this {
    this.ops.push(() => this.redis.expire(key, seconds));
    return this;
  }

  sismember(key: string, member: string): this {
    this.ops.push(() => this.redis.sismember(key, member));
    return this;
  }

  hmget(key: string, ...fields: string[]): this {
    this.ops.push(() => this.redis.hmget(key, ...fields));
    return this;
  }

  hincrbyfloat(key: string, field: string, increment: number): this {
    this.ops.push(() => this.redis.hincrbyfloat(key, field, increment));
    return this;
  }

  hincrby(key: string, field: string, increment: number): this {
    this.ops.push(() => this.redis.hincrby(key, field, increment));
    return this;
  }

  incrbyfloat(key: string, increment: number): this {
    this.ops.push(() => this.redis.incrbyfloat(key, increment));
    return this;
  }

  async exec(): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const op of this.ops) {
      results.push(await op());
    }
    return results;
  }
}

export const LOCAL_BLACKLIST_IPS = ["203.0.113.50"] as const;
export const LOCAL_BLACKLIST_DEVICES = ["blacklist_dev_sim_001"] as const;
export const BLACKLIST_IDENTIFIERS_KEY = "blacklist:identifiers";

export function seedLocalBlacklist(store: MemoryRedis): void {
  for (const ip of LOCAL_BLACKLIST_IPS) {
    void store.set(`blacklist:ip:${ip}`, true);
    void store.sadd(BLACKLIST_IDENTIFIERS_KEY, ip);
  }
  for (const device of LOCAL_BLACKLIST_DEVICES) {
    void store.set(`blacklist:device:${device}`, true);
    void store.sadd(BLACKLIST_IDENTIFIERS_KEY, device);
  }
}
