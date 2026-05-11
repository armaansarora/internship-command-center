/**
 * Cohort-density REST helpers (R13 — Differentiate council).
 *
 * The warm-intro network's moat compounds with cohort density. Today a
 * consented user cannot see "47 active members in your school cohort" —
 * the count exists in the data but no surface reads it. This module is
 * the data path that fixes that gap. Visionary / Design wires the
 * rendered surface; this file only returns the numbers.
 *
 * Privacy contract
 * ----------------
 * Every returned value is a COUNT. No row, name, email, or any other
 * identifying field crosses the boundary. The function takes a userId
 * and:
 *   1. Reads the user's own school_name (returns zero-counts on null).
 *   2. Counts other consented users whose school_name matches, EXCLUDING
 *      the calling user from the denominator.
 *   3. Returns `{ schoolCohortSize, addedThisWeek }` — both integers.
 *
 * RLS posture
 * -----------
 * The query uses the admin client. `user_profiles` carries the policy
 * `auth.uid() = id` which would limit a user-scoped read to a single
 * row (their own) — exactly what we'd want for individual identity, but
 * useless for an aggregate count. The admin client is the same pattern
 * the rebuild-match-index helper uses to read OTHER users' profile rows
 * for the consent gate, and the COUNT result never carries identifying
 * fields, so the privacy posture is preserved.
 *
 * Consent gating
 * --------------
 * Only users who are consented AND on the current consent version are
 * counted. The COUNT skips users whose `networking_consent_at` is null
 * or who have revoked. This means "cohort size" reflects the live
 * warm-intro network — not every user who ever signed up with a school.
 *
 * Schema source: src/db/schema.ts → userProfiles.schoolName.
 * Migration: src/db/migrations/0035_user_profiles_school_name.sql.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CURRENT_CONSENT_VERSION } from "@/lib/networking/consent-version";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortDensity {
  /**
   * Count of OTHER consented users on the warm-intro network whose
   * `school_name` matches the caller's. Excludes the caller. Zero if the
   * caller has no school set or is the only consented user at their
   * school.
   *
   * Suppression: returns 0 when the true count is below
   * `K_ANONYMITY_THRESHOLD`. Small cohorts (e.g., size 1 = "you and one
   * other") can be a deanonymization vector — a user who sees "1
   * cohort member this week" + knows their classmate just signed up
   * has identified them by inference. The Trust Console surface
   * renders the suppressed-zero indistinguishably from a true zero so
   * the privacy boundary survives.
   */
  schoolCohortSize: number;
  /**
   * Subset of `schoolCohortSize` whose `created_at` is within the last
   * 7 days. Surfaces the "growing cohort" signal — feeds the dashboard
   * micro-copy "5 joined this week." Subject to the same k-anonymity
   * suppression as `schoolCohortSize`.
   */
  addedThisWeek: number;
  /**
   * Set to `true` when either count would have been below
   * `K_ANONYMITY_THRESHOLD` and was suppressed to 0. UI uses this to
   * render "growing cohort" / "early cohort" copy instead of an
   * absolute number, preserving the user-facing signal without leaking
   * the small-cohort count. False when both counts are honest zeros
   * (no school set, or a genuinely empty cohort with the threshold met).
   */
  suppressed: boolean;
}

/**
 * Rolling 7-day window in milliseconds. Exported so tests can pin the
 * boundary without re-deriving it.
 */
export const COHORT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * k-anonymity threshold for cohort counts. Counts strictly below this
 * are suppressed to 0 with `suppressed: true`. 5 is the standard floor
 * for "this group is large enough that a single person cannot be
 * identified by their absence." Exported so tests can pin the boundary
 * without re-deriving it.
 */
export const K_ANONYMITY_THRESHOLD = 5;

// Minimal projection row — we ONLY need to enumerate consented users in
// the same cohort. Each projection here corresponds to a query column
// returned from PostgREST. The full set covers consent gating
// (`networking_consent_*`) and the "added this week" subset
// (`created_at`).
interface CohortRow {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;
  created_at: string;
}

interface OwnSchoolRow {
  school_name: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true iff the row represents an actively-consented user on the
 * current consent version. Mirrors `isConsentedAndCurrent` in
 * rebuild-match-index but stays local so this module has no implicit
 * dep on a sibling networking helper.
 */
function isConsentedAndCurrent(row: CohortRow): boolean {
  if (!row.networking_consent_at) return false;
  if (row.networking_revoked_at) {
    const consentMs = new Date(row.networking_consent_at).getTime();
    const revokedMs = new Date(row.networking_revoked_at).getTime();
    if (revokedMs >= consentMs) return false;
  }
  if ((row.networking_consent_version ?? 0) < CURRENT_CONSENT_VERSION) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Resolve cohort-density signals for the given user. The injected client
 * must be the admin (service-role) Supabase client — passing a
 * user-scoped client would short-circuit to the caller's own row and
 * return zero. Callers are responsible for gating who can request these
 * counts; the function itself returns counts unconditionally for any
 * userId on the admin client.
 *
 * Failure modes:
 *   - Caller has no `school_name` set → returns `{ schoolCohortSize: 0,
 *     addedThisWeek: 0 }` without issuing the COUNT query.
 *   - Caller's user_profiles row missing → throws (this is a system
 *     invariant: every authenticated user has a profile row).
 *   - Supabase REST error → throws with `cohort-density: <msg>` prefix.
 *
 * The function NEVER returns identifying data. The wire shape is two
 * integers; even the SELECT projection requests only consent-gating +
 * created_at columns — no `email`, no `display_name`.
 */
export async function getCohortDensity(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<CohortDensity> {
  // Step 1 — resolve caller's school. Null means no signal to compute.
  const { data: ownRow, error: ownErr } = await client
    .from("user_profiles")
    .select("school_name")
    .eq("id", userId)
    .maybeSingle();
  if (ownErr) {
    throw new Error(`cohort-density: ${ownErr.message}`);
  }
  if (!ownRow) {
    throw new Error("cohort-density: caller profile not found");
  }
  const school = (ownRow as OwnSchoolRow).school_name;
  if (!school) {
    return { schoolCohortSize: 0, addedThisWeek: 0, suppressed: false };
  }

  // Step 2 — count other consented users at the same school. The
  // projection is the minimum needed to:
  //   (a) gate on consent + version,
  //   (b) bucket into the 7-day window.
  // No identifying columns ever leave the database row.
  const { data: rows, error: cohortErr } = await client
    .from("user_profiles")
    .select(
      "networking_consent_at, networking_revoked_at, networking_consent_version, created_at",
    )
    .eq("school_name", school)
    .neq("id", userId);
  if (cohortErr) {
    throw new Error(`cohort-density: ${cohortErr.message}`);
  }

  const cohort = (rows as CohortRow[] | null) ?? [];
  const consentedRows = cohort.filter(isConsentedAndCurrent);
  const weekAgoMs = now.getTime() - COHORT_WEEK_MS;
  const rawSize = consentedRows.length;
  const rawAddedThisWeek = consentedRows.filter((r) => {
    const ms = new Date(r.created_at).getTime();
    return Number.isFinite(ms) && ms >= weekAgoMs;
  }).length;

  // k-anonymity suppression. A cohort size below the threshold is
  // suppressed to 0 because the count itself becomes a deanonymization
  // vector ("you + 1 person" identifies that person if the user knows
  // any classmate just joined). `addedThisWeek` is also suppressed
  // whenever the total cohort is below threshold — surfacing
  // "1 joined this week" in a small cohort is the same leak.
  const totalSuppressed = rawSize > 0 && rawSize < K_ANONYMITY_THRESHOLD;
  const weekSuppressed =
    rawAddedThisWeek > 0 && rawAddedThisWeek < K_ANONYMITY_THRESHOLD;
  const suppressed = totalSuppressed || weekSuppressed;

  return {
    schoolCohortSize: totalSuppressed ? 0 : rawSize,
    addedThisWeek: weekSuppressed || totalSuppressed ? 0 : rawAddedThisWeek,
    suppressed,
  };
}
