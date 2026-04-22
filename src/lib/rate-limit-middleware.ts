import {
  checkAnonymousRateLimit,
  checkTieredRateLimit,
  type RateBucket,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/stripe/entitlements";
import { isProd } from "@/lib/env";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Tiered rate-limit envelope per endpoint class (R0.9).
 *
 * - `"A"` — cheap reads (60 rpm). Notifications, cached external calls,
 *           progression lookups.
 * - `"B"` — agent calls. 20 rpm for free users, 60 rpm for pro/team.
 *           Default for callers that do not pass a tier, preserving
 *           backward compatibility.
 * - `"C"` — side-effectful operations (5 rpm). Signout, destructive mutations,
 *           anything where re-firing faster than once every 12 seconds is abuse.
 */
export type RateTier = "A" | "B" | "C";

interface TierConfig {
  bucket: RateBucket;
  limit: number;
}

/** Static limits per bucket — used to emit meaningful X-RateLimit-Limit. */
const BUCKET_LIMITS: Record<RateBucket, number> = {
  tierA: 60,
  tierBfree: 20,
  tierBpro: 60,
  tierC: 5,
};

const ANON_LIMIT = 20;

// ── Middleware helper ─────────────────────────────────────────────────────────

export type RateLimitHeaders = Record<string, string>;

export interface RateLimitCheck {
  limited: boolean;
  headers: RateLimitHeaders;
  response: Response | null;
}

/**
 * Resolve the bucket + limit for a given tier. Tier B reads the user's
 * subscription tier (free → 20 rpm, pro/team → 60 rpm). Tiers A and C skip
 * the `getUserTier` round-trip entirely — they don't vary by subscription.
 */
async function resolveTier(tier: RateTier, userId: string): Promise<TierConfig> {
  if (tier === "A") return { bucket: "tierA", limit: BUCKET_LIMITS.tierA };
  if (tier === "C") return { bucket: "tierC", limit: BUCKET_LIMITS.tierC };
  // Tier B — distinguish free vs pro/team.
  const subscriptionTier = await getUserTier(userId);
  if (subscriptionTier === "free") {
    return { bucket: "tierBfree", limit: BUCKET_LIMITS.tierBfree };
  }
  return { bucket: "tierBpro", limit: BUCKET_LIMITS.tierBpro };
}

/**
 * Checks the rate limit for the given user.
 * - Picks a bucket based on `tier`: A = cheap reads, B = agent calls
 *   (free/pro distinction via getUserTier), C = side-effectful ops.
 * - Returns a 429 Response when the limit is exceeded, or null otherwise.
 * - Always returns appropriate X-RateLimit-* headers.
 *
 * Defaults to tier `"B"` when no tier is passed, so existing callers that
 * rate-limit agent-like work without an explicit tier continue to behave
 * the same way.
 *
 * Usage in an API route:
 * ```ts
 * const rate = await withRateLimit(user.id, "A");
 * if (rate.response) return rate.response;
 * ```
 */
export async function withRateLimit(
  userId: string,
  tier: RateTier = "B",
): Promise<RateLimitCheck> {
  const { bucket, limit } = await resolveTier(tier, userId);
  const { configured, success, remaining, reset } = await checkTieredRateLimit(
    userId,
    bucket,
  );

  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };

  if (!configured && isProd()) {
    const response = Response.json(
      { error: "Rate limiter is not configured for this environment." },
      {
        status: 503,
        headers,
      }
    );

    return { limited: true, headers, response };
  }

  if (!success) {
    const retryAfter = reset > 0 ? String(Math.ceil((reset - Date.now()) / 1000)) : "60";
    const limitedHeaders: RateLimitHeaders = {
      ...headers,
      "Retry-After": retryAfter,
    };

    const response = Response.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      {
        status: 429,
        headers: limitedHeaders,
      }
    );

    return { limited: true, headers: limitedHeaders, response };
  }

  return { limited: false, headers, response: null };
}

/**
 * Extract a best-effort client IP from a `Request`. Falls back to a
 * synthetic key when behind a proxy that strips headers.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "anon:unknown"
  );
}

/**
 * Rate-limit anonymous (unauthenticated) API calls by client IP.
 * Returns a 429 `Response` when limited, or `null` when allowed.
 */
export async function withAnonymousRateLimit(
  request: Request
): Promise<RateLimitCheck> {
  const ip = getClientIp(request);
  const { configured, success, remaining, reset } = await checkAnonymousRateLimit(ip);

  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": String(ANON_LIMIT),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };

  if (!configured && isProd()) {
    return {
      limited: true,
      headers,
      response: Response.json(
        { error: "Rate limiter is not configured for this environment." },
        { status: 503, headers }
      ),
    };
  }

  if (!success) {
    const retryAfter =
      reset > 0 ? String(Math.ceil((reset - Date.now()) / 1000)) : "60";
    const limitedHeaders: RateLimitHeaders = { ...headers, "Retry-After": retryAfter };
    return {
      limited: true,
      headers: limitedHeaders,
      response: Response.json(
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: limitedHeaders }
      ),
    };
  }

  return { limited: false, headers, response: null };
}

