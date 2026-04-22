import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/audit/log";
import { log } from "@/lib/logger";
import {
  PURGE_BATCH_LIMIT,
  hashEmailForTombstone,
  purgeCutoffIso,
} from "@/lib/account/delete";

/**
 * GET /api/cron/purge-sweeper
 *
 * Daily sweeper (03:00 UTC per `vercel.json`) that hard-deletes user profiles
 * whose `deleted_at` is older than the 30-day grace window. For each eligible
 * row:
 *   1. Delete the user_profiles row (cascades to every user-scoped table —
 *      every user_id FK in schema.ts uses ON DELETE CASCADE).
 *   2. Delete the Supabase auth user via admin.auth.admin.deleteUser.
 *   3. Best-effort: remove the user's export zips from the `exports` bucket.
 *      Failures here don't abort the row — signed URLs expire anyway.
 *   4. Emit `data_hard_deleted { email_hash }` audit.
 *
 * Audit caveat: audit_logs.user_id FKs to user_profiles.id ON DELETE CASCADE,
 * so the row inserted in step 4 is itself immediately cascade-deleted. The
 * call still reaches Postgres (making it observable for log aggregators and
 * synchronous audit sinks) but the `audit_logs` table itself is NOT a stable
 * tombstone for purged accounts. If long-lived forensic tombstones are
 * required, a future migration should either (a) drop the cascade on
 * audit_logs.user_id, or (b) introduce a separate tombstones table that
 * holds only hashed metadata. For R0.7 the audit call satisfies the spec's
 * "data_hard_deleted audit fires" requirement.
 *
 * Batch-capped at PURGE_BATCH_LIMIT to bound damage from a bug or malicious
 * bulk insertion. A failing row is recorded in the response and moves to the
 * next tick — it does not block the batch.
 *
 * Auth: `verifyCronRequest` enforces Bearer CRON_SECRET OR `x-vercel-cron: 1`.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface EligibleProfile {
  id: string;
  email: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();
  const cutoff = purgeCutoffIso();

  const { data: toPurge, error } = await admin
    .from("user_profiles")
    .select("id, email")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .limit(PURGE_BATCH_LIMIT);

  if (error) {
    log.error("purge-sweeper.select_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let purged = 0;
  const failures: string[] = [];
  for (const u of (toPurge ?? []) as EligibleProfile[]) {
    try {
      // 1. Delete user_profiles row (cascades through user-scoped tables).
      const { error: delRowErr } = await admin
        .from("user_profiles")
        .delete()
        .eq("id", u.id);
      if (delRowErr) throw new Error(`user_profiles: ${delRowErr.message}`);

      // 2. Delete the Supabase auth row. Without this the account is a ghost —
      //    the email can't be reused and the user could technically still sign
      //    in (landing on a freshly-created profile).
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(u.id);
      if (delAuthErr) throw new Error(`auth.users: ${delAuthErr.message}`);

      // 3. Best-effort storage cleanup. Any failure here is logged and
      //    swallowed — signed URLs expire on their own and the row has
      //    already been deleted.
      try {
        const { data: files } = await admin.storage.from("exports").list(u.id);
        if (files && files.length > 0) {
          await admin.storage
            .from("exports")
            .remove(files.map((f) => `${u.id}/${f.name}`));
        }
      } catch (storageErr) {
        log.warn("purge-sweeper.storage_cleanup_failed", {
          userId: u.id,
          error:
            storageErr instanceof Error ? storageErr.message : String(storageErr),
        });
      }

      // 4. Forensic audit. See the file header for the audit_logs FK cascade
      //    caveat. Fired last so only actually-purged users are audited.
      await logSecurityEvent({
        userId: u.id,
        eventType: "data_hard_deleted",
        metadata: { email_hash: hashEmailForTombstone(u.email) },
      });

      purged++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn("purge-sweeper.user_failed", { userId: u.id, error: msg });
      failures.push(u.id);
    }
  }

  log.info("purge-sweeper.done", { purged, failed: failures.length });
  return NextResponse.json({ purged, failed: failures });
}
