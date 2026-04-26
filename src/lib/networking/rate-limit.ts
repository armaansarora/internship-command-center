import { createClient } from "@/lib/supabase/server";

/**
 * per-user hourly rate limit for the warm-intro match endpoint.
 *
 * Implementation notes:
 *   - Uses the `bump_match_rate_limit` RPC from migration 0022, which
 *     atomically `INSERT … ON CONFLICT DO UPDATE` on the (user_id, bucket)
 *     counter row and returns `(allowed boolean, count integer)`. Atomic =
 *     two parallel requests from the same user cannot both pass at
 *     count=LIMIT.
 *   - Uses the session-bound `createClient()` (not the admin client) so the
 *     counter writes happen under the authenticated user's JWT, which
 *     matches the RLS policy scoped to `auth.uid() = user_id` on
 *     `match_rate_limit`.
 *   - FAIL-CLOSED on every error: a broken RPC, bad shape, or thrown
 *     exception all return `{ok: false}` with a bounded `retryAfterSeconds`
 *     equal to time until the next hour boundary (upper-bound: 3600).
 *     Preferring availability over safety here would let attackers bypass
 *     the limit by inducing RPC failures — so we close instead.
 */

export const LIMIT = 20; // per hour per user

export type RateLimitOk = { ok: true; remaining: number };
export type RateLimitBlocked = { ok: false; retryAfterSeconds: number };
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

type RateLimitRow = { allowed: boolean; count: number };

function isRateLimitRow(row: unknown): row is RateLimitRow {
  if (row === null || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.allowed === "boolean" && typeof r.count === "number";
}

/**
 * Atomically bumps the user's hourly counter via the `bump_match_rate_limit`
 * RPC. Returns `{ok: true, remaining}` when under the limit;
 * `{ok: false, retryAfterSeconds}` when at/over. FAIL-CLOSED: any RPC error
 * → `{ok: false}` with `retryAfterSeconds` = seconds until the hour boundary
 * resets (upper-bound: 3600).
 */
export async function checkAndBumpRateLimit(userId: string): Promise<RateLimitResult> {
  const now = new Date();
  const bucket = new Date(now);
  bucket.setMinutes(0, 0, 0);
  const bucketIso = bucket.toISOString();
  const secondsToBoundary = 3600 - Math.floor((now.getTime() - bucket.getTime()) / 1000);
  const retryAfterSeconds = Math.min(secondsToBoundary, 3600);

  try {
    const sb = await createClient();
    const { data, error } = await sb.rpc("bump_match_rate_limit", {
      p_user_id: userId,
      p_bucket: bucketIso,
      p_limit: LIMIT,
    });

    if (error) {
      return { ok: false, retryAfterSeconds };
    }

    // RPC returns a table; Supabase may return an array or a single row.
    const row: unknown = Array.isArray(data) ? data[0] : data;
    if (!isRateLimitRow(row)) {
      return { ok: false, retryAfterSeconds };
    }

    if (!row.allowed) {
      return { ok: false, retryAfterSeconds };
    }

    return { ok: true, remaining: Math.max(0, LIMIT - row.count) };
  } catch {
    return { ok: false, retryAfterSeconds };
  }
}
