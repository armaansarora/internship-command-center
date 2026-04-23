import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isProd } from "@/lib/env";

// ── In-memory token-bucket fallback ───────────────────────────────────────────
//
// Used by routes that don't justify the Upstash round-trip (e.g. /api/weather,
// which is hit on every floor change for the skyline). Per-instance only — on
// Vercel Fluid Compute warm instances share the bucket, but a brand-new cold
// start gets a fresh bucket. Good enough for "stop runaway clients", not for
// tight financial limits.
//
// Note: replace with Upstash (multi-instance) once we have a per-IP keying
// strategy. For now, the only callers are authenticated and bucket per user.

interface InMemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, InMemoryBucket>();
const MEMORY_BUCKET_MAX_KEYS = 10_000;

export interface InMemoryRateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * In-memory sliding-window-ish limiter (fixed-window for simplicity).
 *
 * @param key       caller-chosen identity (typically `${routeName}:${userId}`)
 * @param limit     max requests per window
 * @param windowMs  window length in milliseconds
 */
export function checkInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): InMemoryRateLimitResult {
  const now = Date.now();

  // Bound the map to prevent unbounded growth from adversarial keys
  // (audit H-7: weather cache could be exploded by varying coords).
  if (memoryBuckets.size > MEMORY_BUCKET_MAX_KEYS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (oldestKey !== undefined) memoryBuckets.delete(oldestKey);
  }

  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, reset: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetAt,
  };
}

// ── Lazy init ─────────────────────────────────────────────────────────────────

type Tier = "free" | "pro" | "team";

/**
 * Tiered bucket names (R0.9).
 *
 * - `tierA`    — cheap reads (60 rpm). Notifications, cached weather, progression.
 * - `tierBfree` — agent calls, free users (20 rpm).
 * - `tierBpro`  — agent calls, pro/team users (60 rpm).
 * - `tierC`    — side-effectful operations (5 rpm). Signout, destructive mutations.
 */
export type RateBucket = "tierA" | "tierBfree" | "tierBpro" | "tierC";

type RateLimiters =
  & Record<Tier, Ratelimit>
  & Record<RateBucket, Ratelimit>
  & { anon: Ratelimit };

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
    // Legacy subscription-tier buckets — kept for any external callers and for
    // callers that use the raw `checkRateLimit(userId, tier)` signature. New
    // code should prefer `checkTieredRateLimit` + the tier-A/B/C taxonomy.
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
    // R0.9 tiered buckets. Each class has its own Redis prefix so counters
    // don't interfere across endpoint classes.
    tierA: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:tierA",
      analytics: true,
    }),
    tierBfree: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:tierBfree",
      analytics: true,
    }),
    tierBpro: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "rl:tierBpro",
      analytics: true,
    }),
    tierC: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:tierC",
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
 * Check a tiered rate limit bucket for the given user (R0.9).
 *
 * Unlike `checkRateLimit`, the caller picks the bucket explicitly based on
 * endpoint class (cheap read vs agent call vs side-effect). This avoids
 * coupling endpoint throttling to subscription tier.
 *
 * Development fallback: allows requests when Upstash is not configured.
 * Production fallback: fails closed when Upstash is not configured.
 */
export async function checkTieredRateLimit(
  userId: string,
  bucket: RateBucket
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

  const result = await limiters[bucket].limit(userId);
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
