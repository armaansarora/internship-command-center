import { checkAnonymousRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getUserTier } from "@/lib/stripe/entitlements";
import type { SubscriptionTier } from "@/lib/stripe/config";
import { isProd } from "@/lib/env";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 30,
  pro: 100,
  team: 200,
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
 * Checks the rate limit for the given user.
 * - Reads the user's subscription tier from Supabase via getUserTier().
 * - Returns a 429 Response when the limit is exceeded, or null otherwise.
 * - Always returns appropriate X-RateLimit-* headers.
 *
 * Usage in an API route:
 * ```ts
 * const check = await withRateLimit(user.id);
 * if (check.response) return check.response;
 * ```
 */
export async function withRateLimit(userId: string): Promise<RateLimitCheck> {
  const tier = await getUserTier(userId);
  const limit = TIER_LIMITS[tier];
  const { configured, success, remaining, reset } = await checkRateLimit(userId, tier);

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

