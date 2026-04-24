import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertConsented } from "@/lib/networking/consent-guard";
import { checkAndBumpRateLimit } from "@/lib/networking/rate-limit";
import { log } from "@/lib/logger";

/**
 * GET /api/networking/match-candidates
 *
 * Returns the top-N warm-intro candidates precomputed for the current
 * user.  Each candidate is an anonymized counterparty key + company +
 * score.  Every surfaced candidate writes a row to match_events (audit
 * log).  Gates (in order): auth, consent, consent version, rate limit.
 *
 *   200 {ok: true, candidates: [...], rate_limit_remaining}
 *   401 {ok: false, reason: "unauthenticated"}
 *   403 {ok: false, reason: "consent-required" | "consent-version-stale"}
 *   429 {ok: false, reason: "rate-limited", retry_after_seconds}
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
  if (guard) return guard;

  const rl = await checkAndBumpRateLimit(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "rate-limited",
        retry_after_seconds: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const { data: rows, error: readErr } = await sb
    .from("match_candidate_index")
    .select("counterparty_anon_key, company_context, edge_strength")
    .eq("user_id", user.id)
    .gt("invalidates_at", new Date().toISOString())
    .order("edge_strength", { ascending: false })
    .limit(10);

  if (readErr) {
    log.error("match_candidates.read_failed", readErr, { userId: user.id });
    return NextResponse.json(
      { ok: false, reason: "read-error" },
      { status: 500 },
    );
  }

  const candidates = rows ?? [];

  // Audit log — one row per surfaced candidate.  Best-effort: if the
  // insert fails we still return the candidates (the read already paid the
  // rate-limit counter, so silent-dropping the audit write would be
  // worse than a 500).
  if (candidates.length > 0) {
    const { error: logErr } = await sb.from("match_events").insert(
      candidates.map((c) => ({
        user_id: user.id,
        counterparty_anon_key: c.counterparty_anon_key,
        company_context: c.company_context,
        edge_strength: c.edge_strength,
        match_reason: `warm contact at ${c.company_context}`,
      })),
    );
    if (logErr) {
      log.warn("match_candidates.audit_insert_failed", {
        userId: user.id,
        error: logErr.message,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates,
    rate_limit_remaining: rl.remaining,
  });
}
