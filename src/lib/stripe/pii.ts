/**
 * PII redaction helpers for Stripe audit metadata.
 *
 * The audit_logs table is owner-readable (founder ops dashboards) and the
 * Trust Console surface is user-readable for `auth.uid() = user_id` rows.
 * Raw email addresses must NEVER appear in metadata — they are
 * unnecessary for tamper-evidence and they leak PII into a row the user
 * (or a misconfigured admin tool) could pull.
 *
 * Strategy: SHA-256 hash any email we attach to a metadata payload. The
 * hash is stable across deliveries (same input → same digest) so a
 * support engineer can pivot from a Stripe dashboard email to its audit
 * trail without ever seeing the address persisted in our DB.
 *
 * This is a single-purpose helper — no salt, no key. The threat model is
 * "do not leak email through Tower's own surfaces", not "make the hash
 * irreversible against an external dictionary attacker". If RiskCompliance
 * later ships a richer `src/lib/audit/pii-redact.ts` we'll inline-swap
 * the import and delete this file.
 */

import { createHash } from "node:crypto";

/**
 * Returns a `sha256:<hex>` hash of the lowercased, trimmed email. Returns
 * `null` for nullish or empty input so the audit metadata field stays
 * explicitly absent rather than recording a hash-of-empty-string.
 *
 * Idempotent: hashing the same address twice yields the same digest, so
 * audit rows from different Stripe deliveries for the same customer can
 * be correlated after the fact.
 */
export function hashCustomerEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return null;
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`;
}
