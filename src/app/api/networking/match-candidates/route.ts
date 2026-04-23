import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertConsented } from "@/lib/networking/consent-guard";

/**
 * GET /api/networking/match-candidates
 *
 * R8 — this endpoint is the integration point for cross-user warm-intro
 * matching.  It exists in R8 so the consent guard can be wired and
 * tested end-to-end, but the behavior itself ships in R8.x after the
 * Red Team pass.  Until then this endpoint returns 403 for every caller,
 * including consented users, so that no cross-user data can
 * accidentally leak before the Red Team sign-off.
 *
 * Callers see:
 *   401 `{"reason": "unauthenticated"}`      — no session
 *   403 `{"reason": "consent-required"}`     — authenticated but no consent (P3/P4)
 *   403 `{"reason": "gated-red-team-pending"}` — consented but R8 hard-stop
 */
export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, reason: "unauthenticated" },
      { status: 401 },
    );
  }

  const guard = await assertConsented(user.id);
  if (guard) return guard;  // 403 consent-required — P3 / P4

  // R8 hard-stop: even consented callers get 403 until the Red Team pass
  // lands and R8.x flips this to an actual read against the match index.
  return NextResponse.json(
    { ok: false, reason: "gated-red-team-pending" },
    { status: 403 },
  );
}
