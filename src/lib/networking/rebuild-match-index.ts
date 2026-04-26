import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  computeMatchCandidates,
  type CounterpartyContact,
  type UserTarget,
} from "./match-algorithm";
import { CURRENT_CONSENT_VERSION } from "./consent-version";
import { log } from "@/lib/logger";

/**
 * shared per-user match-index rebuild helper.
 *
 * Called by:
 *   - the nightly /api/cron/match-index cron (iteration over all
 *     consented users)
 *   - the R11.4 delta trigger (single-user refresh on contact/application
 *     change)
 *
 * Invariants (§7 of the R11 Brief):
 *   - NEVER writes any row for a user who isn't actively consented on the
 *     current `CURRENT_CONSENT_VERSION`.  Any write path first confirms
 *     the owning user's consent_at is truthy, revoked_at is either falsy
 *     OR older than consent_at, and consent_version is >= current.
 *   - NEVER surfaces a counterparty whose owning user isn't also actively
 *     consented + current-version.  Both ends of the match must be alive
 *     under the same consent contract.
 *   - Writes `match_candidate_index` atomically for this user: the existing
 *     rows are DELETEd first, then the new TOP_N rows are INSERTed.  If
 *     the second step fails the user's cache is empty (fail-closed) —
 *     better a blank panel than stale matches.
 *
 * Sizing (§6 of the R11 Brief):
 *   - COUNTERPARTY_BUDGET = 500 — cap on how many cross-user contacts we
 *     pull into the scoring pass per rebuild.  Protects the cron against
 *     a single runaway user with thousands of target companies.
 *   - TOP_N = 25 — per-user index size cap.
 *   - TTL_HOURS = 24 — rows expire one day after write; the UI filters on
 *     invalidates_at > now().
 */
const TTL_HOURS = 24;
const COUNTERPARTY_BUDGET = 500;
const TOP_N = 25;

interface ProfileConsentRow {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;
}

interface OtherProfileRow extends ProfileConsentRow {
  id: string;
}

interface TargetRow {
  target_company_name: string;
  created_at: string | null;
}

interface ContactRow {
  id: string;
  company_name: string | null;
  last_contact_at: string | null;
  user_id: string;
}

/**
 * Pure consent evaluator. Mirrors `isConsentedShape` in consent-guard but
 * adds the version check so this module doesn't have to call an async
 * route-layer helper. Consent-version-stale owners are NOT consented
 * for matching purposes — the cron treats them identically to revoked.
 */
function isConsentedAndCurrent(row: ProfileConsentRow): boolean {
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

/**
 * Rebuild `match_candidate_index` for a single user.
 * Returns `{written}` — the number of rows inserted. Zero means the user
 * ended up with an empty match panel (no consent, no targets, no
 * qualifying counterparties).
 */
export async function rebuildMatchIndexForUser(
  userId: string,
): Promise<{ written: number }> {
  const admin = getSupabaseAdmin();
  const now = new Date();

  // ── Consent gate — short-circuit immediately if the caller isn't consented
  //    AND current-version. We still DELETE their existing rows so the cache
  //    goes dark as soon as they revoke (or fall behind a version bump).
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      "networking_consent_at, networking_revoked_at, networking_consent_version",
    )
    .eq("id", userId)
    .maybeSingle();

  const profileRow = (profile as ProfileConsentRow | null) ?? null;
  const consented = profileRow ? isConsentedAndCurrent(profileRow) : false;
  if (!consented) {
    await admin.from("match_candidate_index").delete().eq("user_id", userId);
    return { written: 0 };
  }

  // ── Targets: the companies THIS user is interested in. No targets → no
  //    cache to hold, clear it and return.
  const { data: targetsData } = await admin
    .from("networking_match_index")
    .select("target_company_name, created_at")
    .eq("user_id", userId);
  const targetRows = (targetsData as TargetRow[] | null) ?? [];
  const userTargets: UserTarget[] = targetRows.map((r) => ({
    companyName: r.target_company_name,
    insertedAt: r.created_at ?? now.toISOString(),
  }));

  if (userTargets.length === 0) {
    await admin.from("match_candidate_index").delete().eq("user_id", userId);
    return { written: 0 };
  }

  const targetNames = userTargets.map((t) => t.companyName);

  // ── Counterparty pool: contacts owned by OTHER users at any of our
  //    target companies. Capped at COUNTERPARTY_BUDGET so a user with
  //    thousands of targets can't starve the rest of the batch.
  const { data: contactsData } = await admin
    .from("contacts")
    .select("id, company_name, last_contact_at, user_id")
    .in("company_name", targetNames)
    .neq("user_id", userId)
    .limit(COUNTERPARTY_BUDGET);
  const otherContacts = (contactsData as ContactRow[] | null) ?? [];

  // ── Filter: keep only contacts whose owning user is also consented +
  //    current-version. Batch the profile read — we don't want N+1 here.
  const otherUserIds = Array.from(new Set(otherContacts.map((c) => c.user_id)));
  let consentedOwnerIds: Set<string> = new Set();
  if (otherUserIds.length > 0) {
    const { data: otherProfilesData } = await admin
      .from("user_profiles")
      .select(
        "id, networking_consent_at, networking_revoked_at, networking_consent_version",
      )
      .in("id", otherUserIds);
    const otherProfiles =
      (otherProfilesData as OtherProfileRow[] | null) ?? [];
    consentedOwnerIds = new Set(
      otherProfiles
        .filter((p) => isConsentedAndCurrent(p))
        .map((p) => p.id),
    );
  }

  const counterpartyContacts: CounterpartyContact[] = otherContacts
    .filter((c) => consentedOwnerIds.has(c.user_id))
    .map((c) => ({
      id: c.id,
      companyName: c.company_name,
      lastContactAt: c.last_contact_at,
      ownerUserId: c.user_id,
    }));

  const ranked = computeMatchCandidates({
    userTargets,
    counterpartyContacts,
    now,
  }).slice(0, TOP_N);

  // ── Atomic replace. Delete first — if the insert fails, the user's
  //    cache stays empty (acceptable; the next run will rewrite it).
  await admin.from("match_candidate_index").delete().eq("user_id", userId);

  if (ranked.length > 0) {
    const invalidatesAt = new Date(
      now.getTime() + TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const insertRows = ranked.map((r) => ({
      user_id: userId,
      counterparty_anon_key: r.counterpartyAnonKey,
      company_context: r.companyContext,
      edge_strength: r.edgeStrength,
      invalidates_at: invalidatesAt,
    }));
    await admin.from("match_candidate_index").insert(insertRows);
  }

  log.info("match_index.rebuilt", { userId, written: ranked.length });
  return { written: ranked.length };
}
