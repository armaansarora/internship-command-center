import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

/**
 * POST /api/networking/revoke
 *
 * Stamps `networking_revoked_at = now()` for the current user AND clears
 * any rows in `networking_match_index` owned by the user.  The match
 * index is empty in R8 (no rows are ever written until R8.x ships the
 * behavior), but the clear step is here so the revoke surface is
 * complete and forward-compatible.
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

  // Forward-compatible: R8.x will populate match-index rows per active
  // application; we remove them here so revoke is effective immediately.
  const clearErr = await sb
    .from("networking_match_index")
    .delete()
    .eq("user_id", user.id);

  if (clearErr.error) {
    log.warn("networking.revoke_match_clear_failed", {
      userId: user.id,
      error: clearErr.error.message,
    });
    // Non-fatal: the consent stamp is the binding guard.
  }

  return NextResponse.json({ ok: true });
}
