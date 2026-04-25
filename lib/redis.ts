import Redis from "ioredis";
import { env } from "@/lib/env";

let redisClient: Redis | null = null;

export function getRedisClient() {
  if (!env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  }
  return redisClient;
}
