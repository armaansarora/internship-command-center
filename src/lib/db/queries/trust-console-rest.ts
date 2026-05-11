/**
 * Trust Console reader — surfaces the user's audit trail and consent state.
 *
 * PR4 / Trust Console scope:
 *   - `getUserAuditTimeline` reads the most-recent audit_logs rows for the
 *     calling user, so the privacy settings page can render proof-of-action
 *     entries (data exports, networking-consent flips, OAuth changes, etc.).
 *     The query relies on the audit_logs_self_read RLS policy, so passing
 *     the caller-scoped Supabase client (NOT the admin client) is required:
 *     each user only sees their own rows.
 *
 *   - `getUserConsentState` reads the networking-consent columns on
 *     user_profiles and derives a single "opted_in" | "revoked" | "never_opted_in"
 *     state value. The mirror of `assertConsented` lives in
 *     src/lib/networking/consent-guard.ts — this function deliberately stays
 *     read-only so the Trust Console UI never accidentally mutates state.
 *
 * Schema notes
 * ------------
 * The networking-consent columns on user_profiles are
 *   - networking_consent_at      (timestamptz, null until first consent)
 *   - networking_revoked_at      (timestamptz, null until first revoke)
 *   - networking_consent_version (integer, null/0 until first consent)
 *
 * `networking_consent_at` is the timestamp of the LAST opt-in, NOT the
 * first — the consent guard treats consent as "live" when consent_at is
 * set AND (revoked_at IS NULL OR revoked_at < consent_at). We mirror that
 * derivation here so UI and guard agree on the same state machine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditLogRow = Row<"audit_logs">;

export interface GetUserAuditTimelineOptions {
  /** Maximum rows to return. Defaults to 100 — enough for the timeline view. */
  limit?: number;
  /** ISO-8601 lower bound on created_at. Omit for "all rows". */
  sinceIso?: string;
}

export type NetworkingConsentState =
  | "opted_in"
  | "revoked"
  | "never_opted_in";

export interface UserConsentState {
  networking: {
    state: NetworkingConsentState;
    /**
     * For `opted_in`: ISO timestamp of the latest opt-in.
     * For `revoked`: ISO timestamp of the latest revoke.
     * For `never_opted_in`: null.
     */
    sinceIso: string | null;
    /**
     * The consent_version the user is on right now. Null means the user
     * has never opted in (so version is not meaningful).
     */
    consentVersion: number | null;
  };
}

// ---------------------------------------------------------------------------
// getUserAuditTimeline
// ---------------------------------------------------------------------------

/**
 * Fetch the caller's audit_logs rows in reverse chronological order.
 *
 * MUST be called with a request-scoped Supabase client (not the admin
 * client) so the `audit_logs_self_read` policy scopes the query to the
 * authenticated user. Passing the admin client would bypass RLS and leak
 * cross-user rows — this is intentional and the call site enforces it.
 *
 * Returns an empty array on error; never throws. Trust Console renders an
 * empty state gracefully when the read fails.
 */
export async function getUserAuditTimeline(
  client: SupabaseClient,
  userId: string,
  opts: GetUserAuditTimelineOptions = {},
): Promise<AuditLogRow[]> {
  const limit = opts.limit ?? 100;

  let query = client
    .from("audit_logs")
    .select(
      "id, user_id, event_type, resource_type, resource_id, metadata, ip_address, user_agent, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.sinceIso !== undefined) {
    query = query.gte("created_at", opts.sinceIso);
  }

  const { data, error } = await query;

  if (error) {
    log.warn("trust_console.audit_timeline_read_failed", {
      userId,
      error: error.message,
    });
    return [];
  }

  return (data ?? []) as AuditLogRow[];
}

// ---------------------------------------------------------------------------
// getUserConsentState
// ---------------------------------------------------------------------------

/**
 * Read the caller's networking-consent state from `user_profiles`.
 *
 * State derivation mirrors `assertConsented`:
 *   - never_opted_in  : networking_consent_at IS NULL
 *   - revoked         : networking_revoked_at IS NOT NULL AND
 *                       networking_revoked_at >= networking_consent_at
 *   - opted_in        : otherwise (consent_at set and not revoked since)
 *
 * Returns a safe `never_opted_in` shape on read error so the UI degrades
 * gracefully — no thrown exceptions to manage at the call site.
 */
export async function getUserConsentState(
  client: SupabaseClient,
  userId: string,
): Promise<UserConsentState> {
  const { data, error } = await client
    .from("user_profiles")
    .select(
      "networking_consent_at, networking_revoked_at, networking_consent_version",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    log.warn("trust_console.consent_state_read_failed", {
      userId,
      error: error.message,
    });
    return {
      networking: {
        state: "never_opted_in",
        sinceIso: null,
        consentVersion: null,
      },
    };
  }

  if (!data) {
    return {
      networking: {
        state: "never_opted_in",
        sinceIso: null,
        consentVersion: null,
      },
    };
  }

  const row = data as Pick<
    Row<"user_profiles">,
    | "networking_consent_at"
    | "networking_revoked_at"
    | "networking_consent_version"
  >;

  const consentAt = row.networking_consent_at;
  const revokedAt = row.networking_revoked_at;
  const consentVersion = row.networking_consent_version ?? null;

  if (consentAt === null || consentAt === undefined) {
    return {
      networking: {
        state: "never_opted_in",
        sinceIso: null,
        consentVersion,
      },
    };
  }

  // Compare ISO strings directly — lexicographic order matches chronological
  // order for canonical timestamptz strings. Revoke wins ties (>=) because
  // the consent guard treats a same-instant revoke as effective.
  if (
    revokedAt !== null &&
    revokedAt !== undefined &&
    revokedAt >= consentAt
  ) {
    return {
      networking: {
        state: "revoked",
        sinceIso: revokedAt,
        consentVersion,
      },
    };
  }

  return {
    networking: {
      state: "opted_in",
      sinceIso: consentAt,
      consentVersion,
    },
  };
}
