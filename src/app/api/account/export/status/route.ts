import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

/**
 * GET /api/account/export/status
 *
 * Trust Console polling endpoint. The /settings/privacy "Request data
 * export" affordance hits POST /api/account/export to queue a job, then
 * polls this route every few seconds until status flips to "delivered"
 * — at which point the response carries a fresh signed download URL the
 * client can hand to the browser.
 *
 * Status state machine (mirrors `user_profiles.data_export_status`):
 *
 *   - `idle`      — no export ever requested.
 *   - `queued`    — waiting for the cron worker.
 *   - `running`   — the worker has picked up the job.
 *   - `delivered` — the archive exists in Storage. We mint a fresh
 *                   signed URL on demand so the link is valid for the
 *                   full TTL even if the user polled hours after
 *                   delivery.
 *   - `failed`    — the worker logged a failure. Client surfaces a
 *                   "try again" affordance.
 *
 * Auth: `requireUserApi` ensures only the caller can see their own
 * status. Reads use the service-role admin client because we need both
 * the status column and the user's Storage directory, neither of which
 * has user-friendly RLS attached.
 */
export const dynamic = "force-dynamic";

const BUCKET = "exports";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — the polling client
// uses the link within seconds; we deliberately do NOT mint the cron
// worker's 7-day URL here because that URL is the email-delivery flow,
// not the click-now-from-the-Trust-Console flow.

interface ExportStatusBody {
  status: "idle" | "queued" | "running" | "delivered" | "failed";
  requestedAtIso: string | null;
  deliveredAtIso: string | null;
  /** Present iff status is "delivered" and we successfully minted a
   * fresh signed URL. Clients render a "Download" button when set. */
  downloadUrl: string | null;
  /** When the signed URL expires. ISO timestamp. Null when no URL. */
  downloadExpiresAtIso: string | null;
}

const IDLE_BODY: ExportStatusBody = {
  status: "idle",
  requestedAtIso: null,
  deliveredAtIso: null,
  downloadUrl: null,
  downloadExpiresAtIso: null,
};

export async function GET(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select(
      "data_export_status, data_export_requested_at, data_export_last_delivered_at",
    )
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileErr) {
    log.error("account.export.status_read_failed", undefined, {
      userId: auth.user.id,
      error: profileErr.message,
    });
    return NextResponse.json(IDLE_BODY, { status: 200 });
  }

  const row = profile as
    | {
        data_export_status: string | null;
        data_export_requested_at: string | null;
        data_export_last_delivered_at: string | null;
      }
    | null;

  const status = (row?.data_export_status ??
    "idle") as ExportStatusBody["status"];
  const requestedAtIso = row?.data_export_requested_at ?? null;
  const deliveredAtIso = row?.data_export_last_delivered_at ?? null;

  // The signed-URL is only meaningful for the delivered status. For
  // queued / running we hand back the status so the client can keep
  // polling; for failed the client surfaces a retry CTA without any
  // download link.
  if (status !== "delivered") {
    return NextResponse.json(
      {
        status,
        requestedAtIso,
        deliveredAtIso,
        downloadUrl: null,
        downloadExpiresAtIso: null,
      } satisfies ExportStatusBody,
      { status: 200 },
    );
  }

  try {
    const { data: files, error: listErr } = await admin.storage
      .from(BUCKET)
      .list(auth.user.id, {
        limit: 25,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (listErr) throw new Error(listErr.message);

    const newest = (files ?? [])[0];
    if (!newest) {
      // Cron stamped "delivered" but the file is missing — surface this
      // as "failed" so the client can re-request rather than hanging on
      // an unfulfillable signed-URL.
      log.warn("account.export.status_no_artifact", {
        userId: auth.user.id,
      });
      return NextResponse.json(
        {
          status: "failed",
          requestedAtIso,
          deliveredAtIso,
          downloadUrl: null,
          downloadExpiresAtIso: null,
        } satisfies ExportStatusBody,
        { status: 200 },
      );
    }

    const signed = await admin.storage
      .from(BUCKET)
      .createSignedUrl(
        `${auth.user.id}/${newest.name}`,
        SIGNED_URL_TTL_SECONDS,
      );
    if (signed.error || !signed.data) {
      throw new Error(signed.error?.message ?? "no signed URL");
    }

    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();

    return NextResponse.json(
      {
        status: "delivered",
        requestedAtIso,
        deliveredAtIso,
        downloadUrl: signed.data.signedUrl,
        downloadExpiresAtIso: expiresAt,
      } satisfies ExportStatusBody,
      { status: 200 },
    );
  } catch (err) {
    log.warn("account.export.status_sign_failed", {
      userId: auth.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        status: "delivered",
        requestedAtIso,
        deliveredAtIso,
        downloadUrl: null,
        downloadExpiresAtIso: null,
      } satisfies ExportStatusBody,
      { status: 200 },
    );
  }
}
