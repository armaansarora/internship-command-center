import { createHash } from "node:crypto";

/**
 * PII redaction helpers for `audit_logs.metadata` and other durable
 * structured-log fields. The audit log is the single longest-lived
 * forensic surface in the app — it persists past account deletion in
 * some flows (purge tombstones), it is read by support, and it shows
 * up in the user-facing Trust Console.  Anything written into
 * `metadata` therefore must be either:
 *
 *   - already non-PII (counts, durations, stage strings, table names),
 *   - or run through one of the helpers below so the raw value never
 *     lands at rest.
 *
 * Helpers are pure + side-effect-free so they can be unit-tested
 * without mocking the audit pipeline.
 */

/**
 * SHA-256(value) truncated to 16 hex chars. Stable across calls so the
 * same recipient hashes consistently when audited multiple times.
 * Matches the existing `hashEmailForTombstone` helper in
 * `src/lib/account/delete.ts` so we get one consistent forensic
 * fingerprint shape across the codebase.
 */
export function hashForAudit(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/** Null-safe variant — returns `null` for empty / missing input. */
export function hashForAuditOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return hashForAudit(value);
}

/**
 * Strip the longest PII-ish substrings out of a free-form snippet
 * before it's written to durable storage.  Designed for
 * `recordInjectionAttempt` so attacker-supplied email body content can
 * still be triaged forensically without retaining the originating
 * mailbox addresses or smuggled URLs.
 *
 * What's redacted (in order):
 *   - email addresses → `[email]`
 *   - http(s) URLs → `[url]`
 *   - long digit runs (>= 7) → `[digits]` (phone numbers, account ids)
 *
 * Names, prose, and short numerics are preserved so the pattern is
 * still recognisable for security review.  Output is hard-capped at
 * `maxLength` characters so a hostile payload can't bloat the row.
 */
export function redactSnippetForAudit(snippet: string, maxLength = 200): string {
  let out = snippet ?? "";
  // emails first so the @-sign doesn't survive into the URL pass.
  out = out.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]");
  // urls — protocol-relative + http(s).
  out = out.replace(/\bhttps?:\/\/\S+/gi, "[url]");
  out = out.replace(/\b\/\/\S+/g, "[url]");
  // run of digits — phone / id / ssn-like.
  out = out.replace(/\b\d{7,}\b/g, "[digits]");
  // Whitespace collapse so a long blob of stripped tokens doesn't
  // explode into runs of `[email]_[email]_[email]`.
  out = out.replace(/\s+/g, " ").trim();
  return out.length > maxLength ? `${out.slice(0, maxLength - 1)}…` : out;
}
