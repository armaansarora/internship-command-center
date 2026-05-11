import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifyCronRequest } from "@/lib/auth/cron";
import { withCronHealth } from "@/lib/cron/health";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GATE_CONFIG } from "@/lib/config/gate-config";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { hashForAudit } from "@/lib/audit/pii-redact";
import { buildText, buildHtml, INVITE_SUBJECT } from "@/lib/email/invite-template";

/**
 * GET /api/cron/rolling-invites
 *
 * Daily concierge for the closed-beta queue. Reads the per-day ceiling from
 * `GATE_CONFIG.beta.rollingInvitesPerDay` and walks the waitlist in
 * created_at order, emails each pulled signup via Resend, and flips the row
 * to `status='invited'` with `invited_at = now()` so the next tick picks up
 * the next batch.
 *
 * Gating layers (must all clear before any email is sent):
 *
 *   1. Beta mode — when `GATE_CONFIG.beta.mode !== "rolling"` the route is
 *      a deliberate no-op. The operator owns the flip; we never proactively
 *      invite while mode is "waitlist" (manual triage) or "open" (no queue
 *      at all). Returns 200 + `{ skipped: "mode_not_rolling", count: 0 }`.
 *
 *   2. Resend key — when `RESEND_API_KEY` is unset (fresh bootstrap, key
 *      rotation outage) the route fails OPEN: 200 + `{ skipped:
 *      "no_resend_key", count: 0 }`. Mirrors the Lighthouse Watchdog
 *      convention so a missing key never crashes the cron tick.
 *
 *   3. OutreachBrake — the same global ceiling
 *      `OUTREACH_MAX_PER_TICK_GLOBAL` that protects /api/cron/outreach-sender
 *      caps invites per tick. `OUTREACH_FREEZE_OVERRIDE=1` bypasses the
 *      ceiling (intentional human-in-the-loop unfreeze) but is rare in
 *      practice — rolling-invites runs once a day so the brake almost never
 *      binds.
 *
 * State machine:
 *   * Per row, send Resend → on success UPDATE status='invited',
 *     invited_at=now(); on failure leave row as `waiting`. The next tick
 *     will retry from the top of the queue. No per-row backoff state is
 *     persisted; the daily cadence is the natural retry budget.
 *   * The `id` column of `waitlist_signups` is itself the invite token —
 *     concierge URL is `/lobby?invite=<id>`. The token lives at row scope
 *     so a revoke (delete the row) is a clean undo, and the beta-gate
 *     already keys off `invited_at` so admission is granted the moment
 *     this cron flips the row regardless of whether the token has been
 *     clicked yet.
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1) — same
 * gate as every other Vercel-scheduled cron in the project.
 */
export const maxDuration = 120;

const DEFAULT_PER_TICK_GLOBAL = 100;

/**
 * Minimal row shape pulled from `waitlist_signups`. Columns chosen to keep
 * the cron's working memory small (no IP, no UTM) — the email is the
 * recipient, `id` is the token, and `created_at` is the FIFO key surfaced in
 * the order-by clause upstream.
 */
interface WaitlistRow {
  id: string;
  email: string;
  created_at: string;
}

interface PerRow {
  id: string;
  status: "invited" | "failed";
  error?: string;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const cfg = env();

  // ─── Gate 1: beta mode ────────────────────────────────────────────────
  // The operator is the only one who flips this. Cron stays dormant in
  // every other mode so a typo in vercel.json can't surprise-invite the
  // entire waitlist.
  if (GATE_CONFIG.beta.mode !== "rolling") {
    log.info("rolling_invites.skipped_mode", {
      mode: GATE_CONFIG.beta.mode,
    });
    return NextResponse.json({
      ok: true,
      skipped: "mode_not_rolling",
      count: 0,
      durationMs: Date.now() - startedAt,
    });
  }

  // ─── Gate 2: Resend availability ──────────────────────────────────────
  // Fail OPEN. The watchdog will fire on the resulting cron staleness if
  // this persists, but a single missed tick must not crash the route.
  if (!cfg.RESEND_API_KEY) {
    log.warn("rolling_invites.no_resend_key");
    return NextResponse.json({
      ok: true,
      skipped: "no_resend_key",
      count: 0,
      durationMs: Date.now() - startedAt,
    });
  }

  // ─── Gate 3: OutreachBrake ────────────────────────────────────────────
  // The freeze-override is the project-wide "yes I want to spam, I know
  // what I'm doing" lever — when it's set we waive the per-tick ceiling
  // entirely. Otherwise we clamp the per-day ceiling against the global
  // brake so a misconfigured `rollingInvitesPerDay` cannot blast past it.
  const freezeOverride = cfg.OUTREACH_FREEZE_OVERRIDE === "1";
  const dailyCeiling = GATE_CONFIG.beta.rollingInvitesPerDay;
  const globalCeiling = cfg.OUTREACH_MAX_PER_TICK_GLOBAL ?? DEFAULT_PER_TICK_GLOBAL;
  const effectiveCeiling = freezeOverride
    ? dailyCeiling
    : Math.max(1, Math.min(dailyCeiling, globalCeiling));

  // ─── Pull the next batch ──────────────────────────────────────────────
  // Predicate matches the partial index created in migration 0038. Order
  // by created_at so the longest-waiting signups go first — this is the
  // FIFO promise the waitlist makes implicitly.
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("waitlist_signups")
    .select("id, email, created_at")
    .eq("status", "waiting")
    .is("invited_at", null)
    .order("created_at", { ascending: true })
    .limit(effectiveCeiling);

  if (error) {
    log.error("rolling_invites.fetch_failed", undefined, {
      error: error.message,
    });
    return NextResponse.json(
      { error: `waitlist fetch failed: ${error.message}` },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as WaitlistRow[];

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      invited: 0,
      failed: 0,
      ceiling: effectiveCeiling,
      mode: GATE_CONFIG.beta.mode,
      durationMs: Date.now() - startedAt,
    });
  }

  // Construct the Resend client once for the batch. Each `.send` is a
  // discrete HTTP call so a single failure cannot poison the rest of the
  // batch — the per-row try/catch below confines damage.
  const resend = new Resend(cfg.RESEND_API_KEY);
  const fromAddress = GATE_CONFIG.brand.senderEmail;
  const lobbyUrl = `${GATE_CONFIG.brand.url()}/lobby`;

  let invitedCount = 0;
  let failedCount = 0;
  const perRow: PerRow[] = [];

  for (const row of rows) {
    const inviteUrl = `${lobbyUrl}?invite=${encodeURIComponent(row.id)}`;
    const text = buildText({ email: row.email, inviteUrl });
    const html = buildHtml({ email: row.email, inviteUrl });

    try {
      const sendResult = await resend.emails.send({
        from: fromAddress,
        to: row.email,
        subject: INVITE_SUBJECT,
        text,
        html,
      });

      // Resend returns `{ data, error }` instead of throwing on a soft
      // delivery failure (rate-limit, bounced address). Treat that path
      // the same as a thrown error: leave the row in `waiting`, increment
      // failed, surface the message back to the caller.
      if (sendResult.error) {
        const errMsg = sendResult.error.message ?? "resend rejected";
        failedCount += 1;
        perRow.push({ id: row.id, status: "failed", error: errMsg });
        log.warn("rolling_invites.resend_failed", {
          inviteId: row.id,
          emailHash: hashForAudit(row.email),
          error: errMsg,
        });
        continue;
      }

      // Successful send — flip the row. Even if this UPDATE fails the
      // email is already in flight; we log the row id so the operator can
      // reconcile manually. Re-running the cron is safe because the row
      // would re-enter the working set, but Resend's idempotency-key API
      // is not used here so a manual replay would double-send.
      const { error: updateErr } = await admin
        .from("waitlist_signups")
        .update({
          status: "invited",
          invited_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "waiting")
        .is("invited_at", null);

      if (updateErr) {
        log.error("rolling_invites.update_after_send_failed", undefined, {
          inviteId: row.id,
          messageId: sendResult.data?.id ?? null,
          error: updateErr.message,
        });
        // The email landed — count it as invited. Manual reconcile only.
      }

      invitedCount += 1;
      perRow.push({ id: row.id, status: "invited" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failedCount += 1;
      perRow.push({ id: row.id, status: "failed", error: msg });
      log.error("rolling_invites.send_threw", err, {
        inviteId: row.id,
        emailHash: hashForAudit(row.email),
        error: msg,
      });
    }
  }

  // Anything not invited this tick stays in the queue. We compute the
  // deferred estimate so the operator can spot a backlog forming (e.g., the
  // queue ran past the daily ceiling for several days in a row).
  const deferred = Math.max(0, rows.length - invitedCount - failedCount);
  const durationMs = Date.now() - startedAt;
  log.info("rolling_invites.batch_complete", {
    invited: invitedCount,
    failed: failedCount,
    deferred,
    ceiling: effectiveCeiling,
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    invited: invitedCount,
    failed: failedCount,
    deferred,
    ceiling: effectiveCeiling,
    mode: GATE_CONFIG.beta.mode,
    durationMs,
    results: perRow,
  });
}

export const GET = withCronHealth("rolling-invites", handle);
