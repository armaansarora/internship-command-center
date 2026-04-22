import { Resend } from "resend";
import { requireEnv } from "@/lib/env";

/**
 * Default "From" address for export emails. Overridable via the
 * EXPORT_EMAIL_FROM env var, but we do NOT require it in the env schema —
 * production installs that haven't configured a domain sender still get a
 * workable default.
 */
const DEFAULT_FROM = "The Tower <archive@tower.example.com>";

interface SendExportParams {
  to: string;
  signedUrl: string;
}

/**
 * Deliver the "your archive is ready" email via Resend.
 *
 * The cron worker (`/api/cron/export-worker`) calls this after uploading the
 * zip to the `exports` bucket and minting a 7-day signed URL. Throws if the
 * delivery fails so the worker can mark the job `failed` and an audit row
 * does NOT get written as `delivered`.
 */
export async function sendExportEmail(
  params: SendExportParams,
): Promise<{ id: string | null | undefined }> {
  const { RESEND_API_KEY } = requireEnv(["RESEND_API_KEY"] as const);
  const from = process.env.EXPORT_EMAIL_FROM ?? DEFAULT_FROM;

  const resend = new Resend(RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: "Your Tower archive is ready",
    text: [
      "Your data has been sealed into an archive.",
      "",
      "Download (valid for 7 days):",
      params.signedUrl,
      "",
      "If you didn't request this, reach out.",
      "",
      "— The Concierge",
    ].join("\n"),
  });

  if (result.error) {
    throw new Error(`resend: ${result.error.message}`);
  }

  return { id: result.data?.id };
}
