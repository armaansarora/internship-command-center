import { env } from "@/lib/env";

export function parseAllowedEmails(raw: string | null | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Closed-beta admission check for post-OAuth callbacks.
 *
 * Empty ALLOWED_EMAILS means the gate is intentionally open, which keeps local
 * dev and previews usable. Production sets ALLOWED_EMAILS, so only listed
 * emails may get a Tower session.
 */
export function isEmailAllowedForBeta(email: string | null | undefined): boolean {
  const allowed = parseAllowedEmails(env().ALLOWED_EMAILS);
  if (allowed.size === 0 || allowed.has("*")) return true;
  if (!email) return false;
  return allowed.has(email.trim().toLowerCase());
}
