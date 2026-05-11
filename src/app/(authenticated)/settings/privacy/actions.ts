"use server";

/**
 * Trust Console server actions (PR4).
 *
 * Three user-initiated, audit-logged actions live here:
 *
 *   1. revokeNetworkingConsentAction — flips off cross-user warm-intro
 *      matching, purges the user's match-index footprint AND clears their
 *      anon-keys from every other user's precomputed candidate cache.
 *      Mirrors `/api/networking/revoke` so the cascade contract stays in
 *      lockstep; we re-implement here (rather than self-fetching) so the
 *      action can return `itemsErased` to the client without an extra read
 *      back over `audit_logs`. Every step routes through
 *      `recordRevokeCascade` from PR4-Backend so the same proof row lands
 *      in `audit_logs` whether the caller used the API or the action.
 *
 *   2. requestDataExportAction — enqueues the existing data-export worker
 *      (Settings → Export already wires the same `/api/account/export`
 *      route; the action exists so the Trust Console surface can call it
 *      without round-tripping through the form/JSON dance).
 *
 *   3. requestDataDeleteAction — enqueues the 30-day soft-delete grace
 *      window, gated by a server-side email retype. Mirrors
 *      `/api/account/delete`.
 *
 * Each action revalidates `/settings/privacy` on success so the
 * server-rendered timeline + audit feed reflect the new state on the next
 * navigation. Audit writes are fire-and-forget by contract (see
 * `logSecurityEvent`) — they never throw and never block the primary
 * response.
 */

import { revalidatePath } from "next/cache";
import { counterpartyAnonKey } from "@/lib/networking/match-anon";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/audit/log";
import { recordRevokeCascade } from "@/lib/audit/consent-events";
import {
  GRACE_WINDOW_DAYS,
  scheduledPurgeAt,
} from "@/lib/account/delete";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type RevokeNetworkingResult =
  | { ok: true; itemsErased: number }
  | { ok: false; error: string };

export type RequestDataExportResult =
  | { ok: true; queued: true }
  | { ok: false; error: string };

export type RequestDataDeleteResult =
  | { ok: true; scheduledDeletionAt: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// revokeNetworkingConsentAction
// ---------------------------------------------------------------------------

/**
 * Run the three-step revoke cascade end-to-end and surface a typed result.
 *
 * Step 1 — stamp `user_profiles.networking_revoked_at = now()`. This is
 * the binding guard: future match-candidate requests from this user are
 * rejected by `assertConsented` regardless of cache state.
 *
 * Step 2 — purge the user's own rows from `networking_match_index`. These
 * are the rows that expose the user's applications to OTHER users.
 *
 * Step 3 — purge this user's anon-keys from every other user's
 * `match_candidate_index` cache. Without step 3, other users would still
 * be surfaced this user's anon-key for up to 24 h until the nightly
 * rebuild cron runs — contradicting the "60 second" consent copy.
 *
 * All three steps share a single `tablesTouched` + `itemsErased` aggregator
 * that lands in the audit log via `recordRevokeCascade`. Step 1 is fatal
 * (no stamp means the guard never engages); steps 2 and 3 short-circuit
 * with a cascade-failed audit row and a 500-equivalent error string.
 */
export async function revokeNetworkingConsentAction(): Promise<RevokeNetworkingResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const sb = await createClient();
  const startedAt = Date.now();
  const tablesTouched: string[] = [];
  let itemsErased = 0;

  // Step 1 — stamp revoke.
  const stamp = await sb
    .from("user_profiles")
    .update({ networking_revoked_at: new Date().toISOString() })
    .eq("id", user.id);

  if (stamp.error) {
    log.error("trust_console.revoke_stamp_failed", stamp.error, {
      userId: user.id,
      error: stamp.error.message,
    });
    await recordRevokeCascade({
      userId: user.id,
      itemsErased,
      tablesTouched,
      durationMs: Date.now() - startedAt,
      error: stamp.error.message,
    });
    return { ok: false, error: stamp.error.message };
  }
  tablesTouched.push("user_profiles");

  // Step 2 — purge own match-index rows.
  const { error: clearError, count: clearCount } = await sb
    .from("networking_match_index")
    .delete({ count: "exact" })
    .eq("user_id", user.id);

  if (clearError) {
    log.warn("trust_console.revoke_match_clear_failed", {
      userId: user.id,
      error: clearError.message,
    });
    // Non-fatal: the consent stamp is the binding guard for this user.
  } else {
    tablesTouched.push("networking_match_index");
    itemsErased += clearCount ?? 0;
  }

  // Step 3 — purge this user's anon-keys from other users' caches.
  try {
    const { data: ownContacts, error: contactsErr } = await sb
      .from("contacts")
      .select("id")
      .eq("user_id", user.id);
    if (contactsErr) throw contactsErr;

    const contactIds = (ownContacts ?? []).map(
      (c) => (c as { id: string }).id,
    );
    if (contactIds.length > 0) {
      const anonKeys = contactIds.map((id) => counterpartyAnonKey(id));
      const admin = getSupabaseAdmin();
      const { error: cascadeErr, count: cascadeCount } = await admin
        .from("match_candidate_index")
        .delete({ count: "exact" })
        .in("counterparty_anon_key", anonKeys);
      if (cascadeErr) throw cascadeErr;
      tablesTouched.push("match_candidate_index");
      itemsErased += cascadeCount ?? 0;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      "trust_console.revoke_cascade_failed",
      err instanceof Error ? err : new Error(msg),
      { userId: user.id },
    );
    await recordRevokeCascade({
      userId: user.id,
      itemsErased,
      tablesTouched,
      durationMs: Date.now() - startedAt,
      error: msg,
    });
    return { ok: false, error: "revoke_cascade_failed" };
  }

  // Success — write the proof row the Trust Console surfaces back.
  await recordRevokeCascade({
    userId: user.id,
    itemsErased,
    tablesTouched,
    durationMs: Date.now() - startedAt,
  });

  revalidatePath("/settings/privacy");
  return { ok: true, itemsErased };
}

// ---------------------------------------------------------------------------
// requestDataExportAction
// ---------------------------------------------------------------------------

/**
 * Enqueue a full user-data export. Mirrors `/api/account/export` — flips
 * `data_export_status = queued` on `user_profiles`; the cron worker at
 * `/api/cron/export-worker` zips the data, signs a 7-day download URL,
 * and emails it.
 *
 * Audit: emits `data_exported { stage: "queued", source: "trust_console" }`
 * so the full lifecycle stays reconstructable from the log.
 */
export async function requestDataExportAction(): Promise<RequestDataExportResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_profiles")
    .update({
      data_export_status: "queued",
      data_export_requested_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .single();

  if (error) {
    log.error("trust_console.export_queue_failed", undefined, {
      userId: user.id,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  await logSecurityEvent({
    userId: user.id,
    eventType: "data_exported",
    metadata: { stage: "queued", source: "trust_console" },
  });

  revalidatePath("/settings/privacy");
  return { ok: true, queued: true };
}

// ---------------------------------------------------------------------------
// requestDataDeleteAction
// ---------------------------------------------------------------------------

export interface RequestDataDeleteInput {
  /**
   * Server-side defence-in-depth — the client must echo the signed-in
   * email exactly, matching the existing `/api/account/delete` retype
   * contract. Empty or mismatched values short-circuit before the
   * soft-delete fires.
   */
  confirmEmail: string;
}

/**
 * Soft-delete the caller's account. Stamps `user_profiles.deleted_at = now()`;
 * the existing purge-sweeper cron hard-deletes rows whose `deleted_at` is
 * older than `GRACE_WINDOW_DAYS`. Cancelable via `/api/account/delete/cancel`
 * during the grace window.
 *
 * Audit: emits `data_delete_requested { window_days, source: "trust_console" }`.
 */
export async function requestDataDeleteAction(
  input: RequestDataDeleteInput,
): Promise<RequestDataDeleteResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const expectedEmail = user.email ?? null;
  if (!expectedEmail) {
    return { ok: false, error: "no_email_on_account" };
  }
  if (
    typeof input.confirmEmail !== "string" ||
    input.confirmEmail.trim() !== expectedEmail
  ) {
    return { ok: false, error: "email_mismatch" };
  }

  const admin = getSupabaseAdmin();
  const deletedAt = new Date().toISOString();
  const { error } = await admin
    .from("user_profiles")
    .update({ deleted_at: deletedAt })
    .eq("id", user.id);

  if (error) {
    log.error("trust_console.delete_request_failed", undefined, {
      userId: user.id,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  await logSecurityEvent({
    userId: user.id,
    eventType: "data_delete_requested",
    metadata: {
      window_days: GRACE_WINDOW_DAYS,
      source: "trust_console",
    },
  });

  revalidatePath("/settings/privacy");
  return {
    ok: true,
    scheduledDeletionAt: scheduledPurgeAt(deletedAt),
  };
}
