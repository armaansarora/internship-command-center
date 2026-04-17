import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isProd } from "@/lib/env";

// ── Lazy init ─────────────────────────────────────────────────────────────────

type Tier = "free" | "pro" | "team";
type RateLimiters = Record<Tier, Ratelimit> & { anon: Ratelimit };

let _ratelimit: RateLimiters | null = null;
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const e = env();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) return null;
  _redis = new Redis({
    url: e.UPSTASH_REDIS_REST_URL,
    token: e.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

function getRateLimiters(): RateLimiters | null {
  if (_ratelimit) return _ratelimit;
  const redis = getRedis();
  if (!redis) return null;

  _ratelimit = {
    free: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "rl:free",
      analytics: true,
    }),
    pro: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "rl:pro",
      analytics: true,
    }),
    team: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1 m"),
      prefix: "rl:team",
      analytics: true,
    }),
    anon: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:anon",
      analytics: true,
    }),
  };
  return _ratelimit;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  configured: boolean;
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check the rate limit for a user.
 * Development fallback: allows requests when Upstash is not configured.
 * Production fallback: fails closed when Upstash is not configured.
 */
export async function checkRateLimit(
  userId: string,
  tier: Tier = "free"
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();
  if (!limiters) {
    if (isProd()) {
      return {
        configured: false,
        success: false,
        remaining: 0,
        reset: Date.now() + 60_000,
      };
    }
    return { configured: false, success: true, remaining: 999, reset: 0 };
  }

  const result = await limiters[tier].limit(userId);
  return {
    configured: true,
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Anonymous (IP-scoped) rate limit for unauthenticated endpoints
 * like /api/weather. Fails closed in production when unconfigured.
 */
export async function checkAnonymousRateLimit(
  ip: string
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();
  if (!limiters) {
    if (isProd()) {
      return {
        configured: false,
        success: false,
        remaining: 0,
        reset: Date.now() + 60_000,
      };
    }
    return { configured: false, success: true, remaining: 999, reset: 0 };
  }

  const result = await limiters.anon.limit(ip);
  return {
    configured: true,
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
