import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logSecurityEvent, requestMetadata } from "@/lib/audit/log";
import { GRACE_WINDOW_DAYS, scheduledPurgeAt } from "@/lib/account/delete";

/**
 * POST /api/account/delete
 *
 * Soft-deletes the caller's account. Stamps `user_profiles.deleted_at = now()`;
 * the `/api/cron/purge-sweeper` job hard-deletes rows whose `deleted_at` is
 * older than 30 days. Between the two, a user can reach
 * `/api/account/delete/cancel` to restore the row and abort the purge.
 *
 * Guardrails:
 *   - Auth: must be a signed-in user (401 otherwise).
 *   - Rate limit: Tier C (5 rpm) — aggressive since re-firing makes no sense.
 *   - Email retype: caller must POST `{ confirmEmail }` that matches
 *     `auth.user.email` exactly. This is the "type your email to confirm"
 *     modal's server check — defence in depth against accidental clicks.
 *   - Audit: emits `data_delete_requested { window_days: 30 }` so the
 *     lifecycle (requested → canceled | hard_deleted) is reconstructable.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const rate = await withRateLimit(auth.user.id, "C");
  if (rate.response) return rate.response;

  const { confirmEmail } = (await req.json().catch(() => ({}))) as {
    confirmEmail?: string;
  };
  if (!confirmEmail || confirmEmail !== auth.user.email) {
    return NextResponse.json(
      {
        error: "email_mismatch",
        message: "Please retype your email exactly to confirm.",
      },
      { status: 400, headers: rate.headers },
    );
  }

  const admin = getSupabaseAdmin();
  const deletedAt = new Date().toISOString();
  const { error } = await admin
    .from("user_profiles")
    .update({ deleted_at: deletedAt })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: rate.headers },
    );
  }

  await logSecurityEvent({
    userId: auth.user.id,
    eventType: "data_delete_requested",
    metadata: { window_days: GRACE_WINDOW_DAYS },
    ...requestMetadata(req),
  });

  return NextResponse.json(
    { scheduledDeletionAt: scheduledPurgeAt(deletedAt) },
    { headers: rate.headers },
  );
}
