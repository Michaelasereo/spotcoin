import { prisma } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const redis = getRedisClient();
    if (redis) {
      if (redis.status !== "ready") {
        await redis.connect();
      }
      await redis.ping();
    }

    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ status: "degraded", timestamp: new Date().toISOString() }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
}
