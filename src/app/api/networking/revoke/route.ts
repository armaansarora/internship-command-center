import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { counterpartyAnonKey } from "@/lib/networking/match-anon";
import { log } from "@/lib/logger";

/**
 * POST /api/networking/revoke
 *
 * Consent-copy promise: "Revoking is instant.  Within 60 seconds, your
 * name and applications are removed from the match index."  Delivering on
 * that means a three-step cascade:
 *
 *   1. Stamp `networking_revoked_at = now()` — binding guard (all future
 *      match-candidates requests from this user return 403 consent-required).
 *   2. Clear the R8 `networking_match_index` rows (source-of-truth for who
 *      this user's applications would expose to OTHER users).
 *   3. R11 Red Team fix (2026-04-24) — clear R11 `match_candidate_index`
 *      rows across ALL users whose `counterparty_anon_key` derives from
 *      THIS user's contacts.  Without this step, other users' precomputed
 *      match caches keep surfacing this user's anon-keys for up to 24h
 *      until the nightly cron rebuilds them — contradicting the 60-second
 *      promise in the consent copy.
 *
 * Step 3 uses the deterministic HMAC-SHA256 of each contact ID to compute
 * the set of anon-keys to purge.  `counterpartyAnonKey` throws if
 * MATCH_ANON_SECRET is unset (fail-closed) — the route returns 500 in that
 * case rather than silently degrading.
 */
export async function POST() {
  const sb = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  // Step 1 — stamp revoke.
  const stampErr = await sb
    .from("user_profiles")
    .update({ networking_revoked_at: new Date().toISOString() })
    .eq("id", user.id);

  if (stampErr.error) {
    log.error("networking.revoke_stamp_failed", stampErr.error, {
      userId: user.id,
      error: stampErr.error.message,
    });
    return NextResponse.json({ ok: false, error: stampErr.error.message }, { status: 500 });
  }

  // Step 2 — clear R8 networking_match_index rows for this user.
  const clearErr = await sb
    .from("networking_match_index")
    .delete()
    .eq("user_id", user.id);

  if (clearErr.error) {
    log.warn("networking.revoke_match_clear_failed", {
      userId: user.id,
      error: clearErr.error.message,
    });
    // Non-fatal: the consent stamp is the binding guard for this user's
    // own endpoint access.  Other users' caches are cleared in Step 3.
  }

  // Step 3 — cascade purge: remove this user's anon-keys from every
  // OTHER user's match_candidate_index cache.  Fail-closed if the anon
  // secret is missing or the cascade errors (the consent copy's
  // 60-second promise is load-bearing legally/privacy-wise, so we'd
  // rather the revoke surface a retryable 500 than silently leave
  // stale anon-keys in other users' caches).
  try {
    const { data: ownContacts, error: contactsErr } = await sb
      .from("contacts")
      .select("id")
      .eq("user_id", user.id);
    if (contactsErr) throw contactsErr;

    const contactIds = (ownContacts ?? []).map((c) => c.id as string);
    if (contactIds.length > 0) {
      const anonKeys = contactIds.map((id) => counterpartyAnonKey(id));
      const { error: cascadeErr } = await sb
        .from("match_candidate_index")
        .delete()
        .in("counterparty_anon_key", anonKeys);
      if (cascadeErr) throw cascadeErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      "networking.revoke_cascade_failed",
      err instanceof Error ? err : new Error(msg),
      { userId: user.id },
    );
    return NextResponse.json(
      { ok: false, reason: "revoke-cascade-failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
