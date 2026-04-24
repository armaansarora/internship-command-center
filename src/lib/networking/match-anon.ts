import { createHmac } from "node:crypto";

/**
 * HMAC-SHA256(secret, contactId) → hex. Deterministic so the same contact
 * always maps to the same anon key across users' match results — but
 * non-reversible without MATCH_ANON_SECRET. Fail-closed: throws if the
 * secret isn't configured so no unencoded contact IDs ever leak.
 *
 * === INTENTIONAL TRADE-OFF — FLAGGED 2026-04-24 R11 RED TEAM ===
 * The anon key is NOT user-scoped. `counterpartyAnonKey("contact-x")`
 * returns the same hex for every caller. This is load-bearing for the
 * revoke cascade in /api/networking/revoke — on revoke, we compute the
 * revoking user's contacts' anon-keys in TS and DELETE FROM
 * match_candidate_index WHERE counterparty_anon_key IN (...) to purge
 * them from every OTHER user's precomputed cache. Without determinism
 * across users, that DELETE couldn't work without a new source_user_id
 * column on match_candidate_index (extra schema surface for what's
 * effectively a cascade mechanism).
 *
 * The trade-off: a snoop who observes anon-keys across match_events
 * rows for multiple contacts THEY OWN could correlate repeated hashes
 * back to the same underlying contact ID (if two different users each
 * referenced the same contact, the same anon-key appears in both
 * audit rows). The correlation is one-way — the snoop cannot invert
 * the hash to recover the contact_id without the HMAC secret — but
 * they CAN learn "these two surfaced matches share a counterparty."
 *
 * Deemed acceptable for R11 because:
 *   (1) match_events rows are per-user and RLS-gated; a snoop only
 *       sees their OWN audit rows, not others'.
 *   (2) the correlation requires the snoop to ALREADY have access to
 *       both audit rows AND to the underlying contact; the leak is
 *       marginal at best.
 *   (3) the fix (user-scoped salt: HMAC(secret, userId+contactId))
 *       would break revoke cascade — either accept the 24h staleness
 *       promise in consent copy (regression), or ship a source_user_id
 *       column + index for cascade-by-source (next phase).
 *
 * Tracked for post-R11 phase: if future audit exposes cross-user anon
 * keys (e.g., if match_events becomes shared across users for some
 * reason), revisit this. A user-scoped variant would look like:
 *   HMAC(secret, `${userId}:${contactId}`)
 * with a parallel source_user_id column on match_candidate_index so
 * revoke-cascade can still find the rows to purge.
 */
export function counterpartyAnonKey(contactId: string): string {
  const secret = process.env.MATCH_ANON_SECRET;
  if (!secret) {
    throw new Error("MATCH_ANON_SECRET not configured; fail-closed");
  }
  return createHmac("sha256", secret).update(contactId).digest("hex");
}
