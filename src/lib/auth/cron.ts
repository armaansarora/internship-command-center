interface CronAuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Verify that a cron request is authorized.
 *
 * In production, CRON_SECRET is mandatory and must match Authorization: Bearer <secret>.
 * In local development, requests are allowed without a secret.
 */
export function verifyCronRequest(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isProduction = process.env.NODE_ENV === "production";

  if (!cronSecret) {
    if (isProduction) {
      return {
        ok: false,
        error: "CRON_SECRET is not configured in production.",
      };
    }
    return { ok: true };
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, error: "Invalid cron authorization header." };
  }

  return { ok: true };
}
