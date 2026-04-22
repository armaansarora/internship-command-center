import { createHash } from "crypto";

/**
 * R0.7 — account deletion helpers.
 *
 * The flow is a two-stage soft-then-hard delete:
 *   1. POST /api/account/delete stamps `user_profiles.deleted_at = now()`.
 *   2. Users have `GRACE_WINDOW_DAYS` to sign back in and POST
 *      /api/account/delete/cancel, which nulls `deleted_at` again.
 *   3. /api/cron/purge-sweeper runs daily at 03:00 UTC, picks rows where
 *      `deleted_at < now() - GRACE_WINDOW_DAYS`, and hard-deletes the
 *      user from `user_profiles` (cascade) and `auth.users` (direct),
 *      plus best-effort cleanup of the exports Storage bucket.
 *
 * Helpers here are pure / side-effect-free so they can be unit-tested
 * without mocking Supabase.
 */

/** Number of days between soft-delete and hard-delete. */
export const GRACE_WINDOW_DAYS = 30;

/** Max rows purged per cron tick — guards against a runaway sweep nuking the DB. */
export const PURGE_BATCH_LIMIT = 10;

/** Human-readable grace window in milliseconds. */
export const GRACE_WINDOW_MS = GRACE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * SHA-256(email) truncated to 16 hex chars. Not auth-grade — used only
 * as a forensic tombstone in `audit_logs` so a future "who got purged"
 * query can correlate without retaining the email itself.
 */
export function hashEmailForTombstone(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 16);
}

/**
 * Given a `deleted_at` ISO timestamp, compute when the 30-day cancel
 * window closes. Returns an ISO string so it can flow into JSON responses
 * without further conversion.
 */
export function scheduledPurgeAt(deletedAtIso: string): string {
  const deletedAt = new Date(deletedAtIso);
  return new Date(deletedAt.getTime() + GRACE_WINDOW_MS).toISOString();
}

/**
 * Returns true iff `now` falls within the grace window — i.e. the user can
 * still cancel the deletion. Expressed as a pure function so the route's
 * 410-vs-200 branch is trivially unit-testable.
 */
export function isWithinCancelWindow(deletedAtIso: string, now = Date.now()): boolean {
  const deletedAt = new Date(deletedAtIso).getTime();
  if (!Number.isFinite(deletedAt)) return false;
  return now <= deletedAt + GRACE_WINDOW_MS;
}

/**
 * Returns the ISO timestamp that represents the cutoff used by the
 * purge sweeper: rows with `deleted_at < cutoff` are eligible for
 * hard delete. Exposed as a helper so the cron route and tests agree.
 */
export function purgeCutoffIso(now = Date.now()): string {
  return new Date(now - GRACE_WINDOW_MS).toISOString();
}
