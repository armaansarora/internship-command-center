import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/email/outreach";
import { logSecurityEvent } from "@/lib/audit/log";
import { log } from "@/lib/logger";

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
 */
export const maxDuration = 120;

const OUTREACH_BATCH_LIMIT = 30;

interface ApprovedRow {
  id: string;
  user_id: string;
  application_id: string | null;
  contact_id: string | null;
  subject: string | null;
  body: string | null;
  type: string | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  const admin = getSupabaseAdmin();

  // Pull approved rows + contact email for delivery.
  // R7.2 — `send_after <= now()` is the load-bearing predicate. Rows whose
  // undo window is still open (send_after > now) must be invisible to this
  // cron; /api/outreach/undo runs with the opposite predicate. Mutual
  // exclusion is enforced by the database, not the UI.
  const nowIso = new Date().toISOString();
  const { data: approvedRows, error: fetchErr } = await admin
    .from("outreach_queue")
    .select("id, user_id, application_id, contact_id, subject, body, type")
    .eq("status", "approved")
    .is("sent_at", null)
    .lte("send_after", nowIso)
    .order("approved_at", { ascending: true })
    .limit(OUTREACH_BATCH_LIMIT);

  if (fetchErr) {
    log.error("outreach_sender.fetch_failed", fetchErr, {
      error: fetchErr.message,
    });
    return NextResponse.json(
      { error: `fetch approved failed: ${fetchErr.message}` },
      { status: 500 }
    );
  }

  const rows: ApprovedRow[] = (approvedRows ?? []) as ApprovedRow[];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      sent: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
    });
  }

  // Resolve user replyTo + contact email per row. One query each so a bad row
  // doesn't poison the batch.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const contactIds = rows
    .map((r) => r.contact_id)
    .filter((x): x is string => typeof x === "string");

  const [usersResult, contactsResult] = await Promise.all([
    admin.from("user_profiles").select("id, email").in("id", userIds),
    contactIds.length > 0
      ? admin
          .from("contacts")
          .select("id, email")
          .in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const userEmail = new Map<string, string>();
  for (const u of usersResult.data ?? []) {
    if (u.email) userEmail.set(u.id as string, u.email as string);
  }
  const contactEmail = new Map<string, string>();
  for (const c of contactsResult.data ?? []) {
    if (c.email) contactEmail.set(c.id as string, c.email as string);
  }

  let sentCount = 0;
  let failedCount = 0;
  const perRow: Array<{ id: string; status: string; error?: string }> = [];

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

      void logSecurityEvent({
        userId: row.user_id,
        eventType: "agent_side_effect_email_sent",
        resourceType: "outreach_queue",
        resourceId: row.id,
        metadata: {
          to,
          outreachType: row.type,
          applicationId: row.application_id,
          messageId,
        },
      });

      sentCount += 1;
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
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    sent: sentCount,
    failed: failedCount,
    durationMs,
    results: perRow,
  });
}
