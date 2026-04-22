import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logSecurityEvent, requestMetadata } from "@/lib/audit/log";

/**
 * POST /api/account/export
 *
 * Queues a full user-data export. The cron worker at
 * `/api/cron/export-worker` sweeps the queue every 5 minutes, zips the user's
 * data, uploads it to the `exports/` Supabase Storage bucket, creates a
 * 7-day signed URL, and emails it via Resend.
 *
 * Guardrails:
 *   - Auth: must be a signed-in user (401 otherwise).
 *   - Rate limit: Tier C (5 rpm). Prevents spam-clicks from flooding the queue.
 *   - Audit: emits a `data_exported { stage: "queued" }` row on success so
 *     the full lifecycle (queued → delivered/failed) is reconstructable from
 *     `audit_logs`.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const rate = await withRateLimit(auth.user.id, "C");
  if (rate.response) return rate.response;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_profiles")
    .update({
      data_export_status: "queued",
      data_export_requested_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: rate.headers },
    );
  }

  await logSecurityEvent({
    userId: auth.user.id,
    eventType: "data_exported",
    metadata: { stage: "queued" },
    ...requestMetadata(req),
  });

  return NextResponse.json({ queued: true }, { headers: rate.headers });
}
