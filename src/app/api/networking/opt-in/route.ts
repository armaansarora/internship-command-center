import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import { CURRENT_CONSENT_VERSION } from "@/lib/networking/consent-version";

/**
 * POST /api/networking/opt-in
 *
 * Stamps the user's networking_consent_at to now(), clears
 * networking_revoked_at, and bumps consent_version to
 * `CURRENT_CONSENT_VERSION` (current version = 2 — pairs the
 * Rolodex consent copy with the match-query / audit-log addendum).
 *
 * Authenticated session required. No payload.
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

  const { error } = await sb
    .from("user_profiles")
    .update({
      networking_consent_at: new Date().toISOString(),
      networking_revoked_at: null,
      networking_consent_version: CURRENT_CONSENT_VERSION,
    })
    .eq("id", user.id);

  if (error) {
    log.error("networking.opt_in_failed", error, { userId: user.id, error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
