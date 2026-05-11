import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/email/outreach";
import { logSecurityEvent } from "@/lib/audit/log";
import { hashForAudit } from "@/lib/audit/pii-redact";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";
import { env } from "@/lib/env";
import { exceedsPerUserDailyCap } from "@/lib/notifications/quiet-hours";
import type { Row } from "@/db/database.types";

/**
 * GET /api/cron/outreach-sender
 *
 * Processes the outreach_queue: pulls up to OUTREACH_BATCH_LIMIT rows with
 * status='approved', attempts to send each via Resend, then updates the row
 * to status='sent' with resend_message_id + sent_at on success. On failure
 * the row remains 'approved' so the next tick retries.
 *
 * Audit:
 *   - On success: agent_side_effect_email_sent with resource_id = outreach id
 *   - Counts + durations in structured logs
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 * Runs every 5 minutes so an approval feels immediate without spamming
 * Resend's rate limits. Idempotent within a row — once sent_at is stamped
 * the row is no longer picked up.
 *
 * Blast-brake (Lighthouse OutreachBrake): three layers stack on top of the
 * per-row queue logic to make sure a corrupted approval batch can't blast
 * ten-thousand emails before anyone notices.
 *
 *   1. Pending-queue circuit breaker — if the count of approved-but-unsent
 *      rows is at or above OUTREACH_PENDING_FREEZE_AT, the route REFUSES to
 *      drain anything and returns `{ frozen: true }`. The only way out is
 *      for the owner to flip OUTREACH_FREEZE_OVERRIDE=1 in Vercel and
 *      redeploy — a deliberate human-in-the-loop gate. We use the count of
 *      `status='approved'` rows (rather than `pending_approval` drafts)
 *      because that's the queue this cron is about to act on; a sudden
 *      spike there is the corruption signal.
 *
 *   2. Per-tick global ceiling — once we know we're allowed to drain, we
 *      cap this tick to OUTREACH_MAX_PER_TICK_GLOBAL rows. The Supabase
 *      query is already bounded by `.limit(...)`, so the ceiling shrinks
 *      that limit when it's smaller than OUTREACH_BATCH_LIMIT. The
 *      remaining rows simply sit in the queue and get picked up next tick.
 *
 *   3. Per-user daily ceiling — for each row we'd otherwise send, we check
 *      how many emails this user has already sent in the last 24 hours.
 *      If that count meets or exceeds OUTREACH_MAX_PER_USER_DAILY, the row
 *      is skipped this tick (left as `approved` so it retries tomorrow once
 *      yesterday's sends fall off the rolling window) and an audit event
 *      with `reason: per_user_daily_cap` is emitted.
 */
export const maxDuration = 120;

const OUTREACH_BATCH_LIMIT = 30;

type ApprovedRow = Pick<
  Row<"outreach_queue">,
  | "id"
  | "user_id"
  | "application_id"
  | "contact_id"
  | "subject"
  | "body"
  | "type"
>;

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  const admin = getSupabaseAdmin();
  const cfg = env();

  // ─── Circuit breaker ──────────────────────────────────────────────────
  // Count rows the cron is about to drain. We deliberately count rows that
  // have already cleared their undo window (`send_after <= now()`); rows
  // still inside the 30-second undo grace period aren't "in flight" yet
  // and shouldn't push us across the freeze threshold.
  const nowIso = new Date().toISOString();
  const freezeOverride = cfg.OUTREACH_FREEZE_OVERRIDE === "1";

  if (!freezeOverride) {
    const { count: pendingCount, error: countErr } = await admin
      .from("outreach_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .is("sent_at", null)
      .lte("send_after", nowIso);

    if (countErr) {
      log.error("outreach_sender.pending_count_failed", countErr, {
        error: countErr.message,
      });
      return NextResponse.json(
        { error: `pending count failed: ${countErr.message}` },
        { status: 500 }
      );
    }

    const pending = pendingCount ?? 0;
    if (pending >= cfg.OUTREACH_PENDING_FREEZE_AT) {
      log.error(
        "outreach.pending_queue_frozen",
        new Error("outreach pending queue frozen"),
        {
          pending,
          freezeAt: cfg.OUTREACH_PENDING_FREEZE_AT,
          override: false,
        },
      );
      return NextResponse.json({
        ok: true,
        frozen: true,
        pending,
        freezeAt: cfg.OUTREACH_PENDING_FREEZE_AT,
        processed: 0,
        sent: 0,
        failed: 0,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  // ─── Per-tick global ceiling ──────────────────────────────────────────
  // Clamp the drain to whichever is smaller: the route's own batch limit
  // or the configured global ceiling. The ceiling is the safety net; the
  // batch limit exists to keep a single tick from running over the
  // 120-second `maxDuration` budget.
  const tickCeiling = Math.max(
    1,
    Math.min(cfg.OUTREACH_MAX_PER_TICK_GLOBAL, OUTREACH_BATCH_LIMIT),
  );

  // We always fetch one extra row above the ceiling so we can detect
  // (and structured-log) overflow without paying for a separate
  // `count(*)`. If we hit `tickCeiling + 1` rows, the spillover is real.
  const overFetchLimit = tickCeiling + 1;
  // Pull approved rows + contact email for delivery.
  // `send_after <= now()` is the load-bearing predicate. Rows whose
  // undo window is still open (send_after > now) must be invisible to this
  // cron; /api/outreach/undo runs with the opposite predicate. Mutual
  // exclusion is enforced by the database, not the UI.
  const { data: approvedRows, error: fetchErr } = await admin
    .from("outreach_queue")
    .select("id, user_id, application_id, contact_id, subject, body, type")
    .eq("status", "approved")
    .is("sent_at", null)
    .lte("send_after", nowIso)
    .order("approved_at", { ascending: true })
    .limit(overFetchLimit);

  if (fetchErr) {
    log.error("outreach_sender.fetch_failed", fetchErr, {
      error: fetchErr.message,
    });
    return NextResponse.json(
      { error: `fetch approved failed: ${fetchErr.message}` },
      { status: 500 }
    );
  }

  const fetched = (approvedRows ?? []) as ApprovedRow[];
  const ceilingHit = fetched.length > tickCeiling;
  const rows: ApprovedRow[] = ceilingHit ? fetched.slice(0, tickCeiling) : fetched;
  // Deferred is "what we deliberately did not touch this tick because of
  // the global ceiling." We can only attest at least one was deferred —
  // the true number requires a separate count and isn't worth the round
  // trip; the watchdog correlates with the pending-queue gauge anyway.
  const deferredEstimate = ceilingHit ? Math.max(0, fetched.length - tickCeiling) : 0;
  if (ceilingHit) {
    log.warn("outreach.global_ceiling_hit", {
      drained: rows.length,
      deferred: deferredEstimate,
      ceiling: tickCeiling,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      sent: 0,
      failed: 0,
      ceiling: tickCeiling,
      ceilingHit,
      deferred: deferredEstimate,
      durationMs: Date.now() - startedAt,
    });
  }

  // Resolve user replyTo + contact email per row. One query each so a bad row
  // doesn't poison the batch.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const contactIds = rows
    .map((r) => r.contact_id)
    .filter((x): x is string => typeof x === "string");

  // Rolling 24h window for the per-user daily cap. We count rows already
  // stamped `sent_at` within the window — the same physical sends that
  // showed up in the recipient's inbox. The window slides per request, so
  // a user who maxed out at 23:50 yesterday is unblocked at 23:51 today,
  // not at midnight wall-clock (avoids a thundering-herd at 00:00).
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [usersResult, contactsResult, recentSendsResult] = await Promise.all([
    admin.from("user_profiles").select("id, email").in("id", userIds),
    contactIds.length > 0
      ? admin
          .from("contacts")
          .select("id, email")
          .in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("outreach_queue")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "sent")
      .gte("sent_at", since24hIso),
  ]);

  const userEmail = new Map<string, string>();
  for (const u of usersResult.data ?? []) {
    if (u.email) userEmail.set(u.id as string, u.email as string);
  }
  const contactEmail = new Map<string, string>();
  for (const c of contactsResult.data ?? []) {
    if (c.email) contactEmail.set(c.id as string, c.email as string);
  }

  // Pre-compute the rolling 24h send count per user. We mutate this map as
  // we send so a single user with N approved rows in this tick still
  // respects the cap (otherwise we'd happily over-send within the batch).
  const sentLast24h = new Map<string, number>();
  for (const r of recentSendsResult.data ?? []) {
    const uid = r.user_id as string;
    sentLast24h.set(uid, (sentLast24h.get(uid) ?? 0) + 1);
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const perRow: Array<{ id: string; status: string; error?: string; reason?: string }> = [];

  for (const row of rows) {
    // Guard against malformed draft rows.
    if (!row.subject || !row.body) {
      failedCount += 1;
      perRow.push({
        id: row.id,
        status: "skipped",
        error: "missing subject/body",
      });
      continue;
    }

    const to = row.contact_id ? contactEmail.get(row.contact_id) : undefined;
    if (!to) {
      failedCount += 1;
      perRow.push({
        id: row.id,
        status: "skipped",
        error: "no recipient email",
      });
      continue;
    }

    // Per-user daily ceiling check. We treat the cap as inclusive: at 25
    // sends in the window, the 26th is the one that gets skipped. The row
    // is left as 'approved' so it gets re-evaluated on the next tick;
    // tomorrow's tick will find one fewer send in the window and proceed.
    const userSent = sentLast24h.get(row.user_id) ?? 0;
    if (
      exceedsPerUserDailyCap({
        sentInLast24h: userSent,
        capPerDay: cfg.OUTREACH_MAX_PER_USER_DAILY,
      })
    ) {
      skippedCount += 1;
      perRow.push({
        id: row.id,
        status: "skipped",
        reason: "per_user_daily_cap",
      });
      // Audit-log the skip so the trust console can show "we held this back
      // because you're at the daily cap" rather than the row mysteriously
      // staying queued. Fire-and-forget — never block the cron loop on
      // audit writes (audit helper swallows its own failures).
      void logSecurityEvent({
        userId: row.user_id,
        eventType: "agent_side_effect_status_updated",
        resourceType: "outreach_queue",
        resourceId: row.id,
        metadata: {
          reason: "per_user_daily_cap",
          sentInLast24h: userSent,
          capPerDay: cfg.OUTREACH_MAX_PER_USER_DAILY,
        },
      });
      log.info("outreach.per_user_daily_cap_skipped", {
        userId: row.user_id,
        outreachId: row.id,
        sentInLast24h: userSent,
        cap: cfg.OUTREACH_MAX_PER_USER_DAILY,
      });
      continue;
    }

    try {
      const { messageId } = await sendOutreachEmail({
        to,
        subject: row.subject,
        body: row.body,
        replyTo: userEmail.get(row.user_id),
      });

      const { error: updateErr } = await admin
        .from("outreach_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_message_id: messageId,
        })
        .eq("id", row.id)
        .eq("user_id", row.user_id);

      if (updateErr) {
        log.warn("outreach_sender.update_after_send_failed", {
          outreachId: row.id,
          error: updateErr.message,
        });
      }

      // PII discipline (R12): never persist the raw recipient address into
      // `audit_logs.metadata`. The Resend `messageId` is the actionable
      // forensic key; a stable hash of the recipient lets support correlate
      // multiple sends to the same target without retaining the raw email.
      void logSecurityEvent({
        userId: row.user_id,
        eventType: "agent_side_effect_email_sent",
        resourceType: "outreach_queue",
        resourceId: row.id,
        metadata: {
          to_hash: hashForAudit(to),
          outreachType: row.type,
          applicationId: row.application_id,
          messageId,
        },
      });

      sentCount += 1;
      // Tick-local counter: a second approved row for the same user this
      // tick correctly triggers the cap once we cross the threshold.
      sentLast24h.set(row.user_id, userSent + 1);
      perRow.push({ id: row.id, status: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failedCount += 1;
      log.error("outreach_sender.send_failed", err, {
        outreachId: row.id,
        error: msg,
      });
      perRow.push({ id: row.id, status: "failed", error: msg });
      // Leave row as 'approved' — the next tick retries.
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info("outreach_sender.batch_complete", {
    processed: rows.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    ceiling: tickCeiling,
    ceilingHit,
    deferred: deferredEstimate,
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    ceiling: tickCeiling,
    ceilingHit,
    deferred: deferredEstimate,
    durationMs,
    results: perRow,
  });
}

export const GET = withCronHealth("outreach-sender", handle);
