import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logSecurityEvent, requestMetadata } from "@/lib/audit/log";
import { isWithinCancelWindow } from "@/lib/account/delete";

/**
 * POST /api/account/delete/cancel
 *
 * Restores a soft-deleted account. Nulls `user_profiles.deleted_at` IFF the
 * caller's row still has a non-null `deleted_at` AND the 30-day grace window
 * has not elapsed. After the purge-sweeper runs the row is gone, so 409 /
 * 410 responses are intentional (no silent resurrection after purge).
 *
 * Guardrails:
 *   - Auth: must be a signed-in user.
 *   - Rate limit: Tier C (5 rpm).
 *   - 409 not_scheduled  — nothing to cancel (deleted_at is null).
 *   - 410 window_expired — caller found the endpoint after the grace window.
 *   - Audit: emits `data_delete_canceled`.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const rate = await withRateLimit(auth.user.id, "C");
  if (rate.response) return rate.response;

  const admin = getSupabaseAdmin();

  const { data, error: readErr } = await admin
    .from("user_profiles")
    .select("deleted_at")
    .eq("id", auth.user.id)
    .single();

  if (readErr) {
    return NextResponse.json(
      { error: readErr.message },
      { status: 500, headers: rate.headers },
    );
  }

  if (!data?.deleted_at) {
    return NextResponse.json(
      { error: "not_scheduled" },
      { status: 409, headers: rate.headers },
    );
  }

  if (!isWithinCancelWindow(data.deleted_at as string)) {
    return NextResponse.json(
      { error: "window_expired" },
      { status: 410, headers: rate.headers },
    );
  }

  const { error } = await admin
    .from("user_profiles")
    .update({ deleted_at: null })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: rate.headers },
    );
  }

  await logSecurityEvent({
    userId: auth.user.id,
    eventType: "data_delete_canceled",
    ...requestMetadata(req),
  });

  return NextResponse.json({ canceled: true }, { headers: rate.headers });
}
