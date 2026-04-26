import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildUserExport } from "@/lib/account/export";
import { sendExportEmail } from "@/lib/email/send-export";
import { logSecurityEvent } from "@/lib/audit/log";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/export-worker
 *
 * Sweeps up to BATCH_LIMIT queued data-export jobs per tick (every 5 min per
 * `vercel.json`). For each queued user:
 *   1. Flip status to `running` (so a concurrent tick doesn't double-process).
 *   2. Build the zip via `buildUserExport`.
 *   3. Upload to the private `exports/` Storage bucket.
 *   4. Mint a 7-day signed URL.
 *   5. Email it via Resend.
 *   6. Write a `data_exported { stage: "delivered", bytes, path }` audit row.
 *   7. Flip status to `delivered`, stamp `data_export_last_delivered_at`.
 *
 * Per-user try/catch: a single failure never halts the batch. On failure,
 * status flips to `failed` and the structured logger emits the reason.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "exports";
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const BATCH_LIMIT = 5;

interface QueuedProfile {
  id: string;
  email: string;
}

interface WorkerResult {
  userId: string;
  status: "delivered" | "failed";
  error?: string;
}

async function handle(request: NextRequest): Promise<Response> {
  const auth = verifyCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: queued, error: fetchError } = await admin
    .from("user_profiles")
    .select("id, email")
    .eq("data_export_status", "queued")
    .limit(BATCH_LIMIT);

  if (fetchError) {
    log.error("export-worker.fetch_failed", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results: WorkerResult[] = [];
  for (const profile of (queued ?? []) as QueuedProfile[]) {
    const result = await processOne(profile);
    results.push(result);
  }

  log.info("export-worker.complete", {
    processed: results.length,
    delivered: results.filter((r) => r.status === "delivered").length,
    failed: results.filter((r) => r.status === "failed").length,
  });

  return NextResponse.json({ processed: results.length, results });
}

async function processOne(profile: QueuedProfile): Promise<WorkerResult> {
  const admin = getSupabaseAdmin();
  const { id: userId, email } = profile;

  try {
    // Mark running so a second cron tick doesn't pick the same row back up
    // before we finish.
    await admin
      .from("user_profiles")
      .update({ data_export_status: "running" })
      .eq("id", userId);

    // Build zip.
    const zipBuffer = await buildUserExport(userId);

    // Upload. Path scheme: `<userId>/<timestamp>.zip` so multiple exports
    // per user coexist and nobody can reach another user's namespace via
    // listing (the bucket is service-role-only regardless).
    const path = `${userId}/${Date.now()}.zip`;
    const uploadRes = await admin.storage.from(BUCKET).upload(path, zipBuffer, {
      contentType: "application/zip",
      upsert: false,
    });
    if (uploadRes.error) {
      throw new Error(`upload: ${uploadRes.error.message}`);
    }

    // Signed URL (7 days).
    const signed = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data) {
      throw new Error(
        `signed_url: ${signed.error?.message ?? "no signed URL returned"}`,
      );
    }

    // Email.
    await sendExportEmail({ to: email, signedUrl: signed.data.signedUrl });

    // Mark delivered + stamp last-delivered.
    await admin
      .from("user_profiles")
      .update({
        data_export_status: "delivered",
        data_export_last_delivered_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await logSecurityEvent({
      userId,
      eventType: "data_exported",
      metadata: { stage: "delivered", bytes: zipBuffer.length, path },
    });

    return { userId, status: "delivered" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("export-worker.user_failed", { userId, error: message });

    // Best-effort status flip — don't let a secondary failure mask the
    // original error.
    try {
      await admin
        .from("user_profiles")
        .update({ data_export_status: "failed" })
        .eq("id", userId);
    } catch (flipErr) {
      log.warn("export-worker.flip_failed_failed", {
        userId,
        error: flipErr instanceof Error ? flipErr.message : String(flipErr),
      });
    }

    return { userId, status: "failed", error: message };
  }
}

export const GET = withCronHealth("export-worker", handle);
