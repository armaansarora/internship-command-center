import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Lazy init ─────────────────────────────────────────────────────────────────

type Tier = "free" | "pro" | "team";
type RateLimiters = Record<Tier, Ratelimit>;

let _ratelimit: RateLimiters | null = null;

function getRateLimiters(): RateLimiters | null {
  if (_ratelimit) return _ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  _ratelimit = {
    free: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:free",
    }),
    pro: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "rl:pro",
    }),
    team: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1 m"),
      prefix: "rl:team",
    }),
  };

  return _ratelimit;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check the rate limit for a user.
 * Returns { success: true, remaining: 999, reset: 0 } when Upstash is not configured.
 */
export async function checkRateLimit(
  userId: string,
  tier: Tier = "free"
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();
  if (!limiters) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const result = await limiters[tier].limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
