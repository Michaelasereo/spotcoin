import { createHash } from "node:crypto";
import { getRedisClient } from "@/lib/redis";

type RateLimitResult = { ok: boolean; remaining: number; resetInSeconds: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function hashKey(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const normalizedKey = `ratelimit:${hashKey(key)}`;

  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect();
      }

      const count = await redis.incr(normalizedKey);
      if (count === 1) {
        await redis.expire(normalizedKey, windowSeconds);
      }
      const ttl = await redis.ttl(normalizedKey);
      const remaining = Math.max(0, limit - count);
      return {
        ok: count <= limit,
        remaining,
        resetInSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch {
      // Fall through to memory store if Redis is unavailable.
    }
  }

  const now = Date.now();
  const existing = memoryStore.get(normalizedKey);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(normalizedKey, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }

  existing.count += 1;
  memoryStore.set(normalizedKey, existing);
  const remaining = Math.max(0, limit - existing.count);
  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);
  return { ok: existing.count <= limit, remaining, resetInSeconds };
}
