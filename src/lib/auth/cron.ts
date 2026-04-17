import { env, isProd } from "@/lib/env";
import { log } from "@/lib/logger";

interface CronAuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Verify that a cron request is authorized.
 *
 * In production, CRON_SECRET is mandatory. Accepts either:
 *   - `x-vercel-cron: 1` header (Vercel internal cron signal), OR
 *   - `Authorization: Bearer <CRON_SECRET>` (external / manual triggers).
 *
 * In local development without CRON_SECRET, requests are allowed.
 * Fails closed in production if CRON_SECRET is unset (audit C-1).
 */
export function verifyCronRequest(request: Request): CronAuthResult {
  const cronSecret = env().CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-vercel-cron");

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

  // Vercel internal cron — trusted by platform.
  if (cronHeader === "1") return { ok: true };

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
