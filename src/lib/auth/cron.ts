import { env, isProd } from "@/lib/env";
import { log } from "@/lib/logger";

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
  const cronSecret = env().CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    if (isProd()) {
      log.error("cron.auth.missing_secret_in_production");
      return {
        ok: false,
        error: "CRON_SECRET is not configured in production.",
      };
    }
    return { ok: true };
  }

  if (!authHeader) {
    return { ok: false, error: "Missing cron authorization header." };
  }

  if (!timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return { ok: false, error: "Invalid cron authorization header." };
  }

  return { ok: true };
}

/**
 * Constant-time string comparison to avoid timing attacks on
 * header authorization checks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
