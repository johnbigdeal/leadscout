import { Redis } from "@upstash/redis";

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export async function checkQuota(orgId: string): Promise<boolean> {
  if (!redis) return true;
  try {
    const key = `quota:${orgId}:${new Date().toISOString().slice(0, 7)}`;
    const current = await redis.get<number>(key);
    return (current ?? 0) < 50;
  } catch {
    return true;
  }
}

export async function incrementUsage(orgId: string): Promise<number> {
  if (!redis) return 0;
  try {
    const key = `quota:${orgId}:${new Date().toISOString().slice(0, 7)}`;
    return redis.incr(key);
  } catch {
    return 0;
  }
}
