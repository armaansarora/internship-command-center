import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;

if (url && token) {
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(40, "1 m"),
    prefix: "tower:cro",
    analytics: true,
  });
}

export type CroRateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

/**
 * Per-user limit on CRO chat POSTs. If Upstash env is unset, allows all traffic
 * (local dev / before Redis is provisioned).
 */
export async function enforceCroRateLimit(userId: string): Promise<CroRateLimitResult> {
  if (!ratelimit) {
    return { limited: false };
  }

  const { success, reset } = await ratelimit.limit(userId);
  if (success) {
    return { limited: false };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { limited: true, retryAfterSeconds };
}
