import { createHmac } from "node:crypto";

/**
 * HMAC-SHA256(secret, contactId) → hex. Deterministic so the same contact
 * always maps to the same anon key across users' match results — but
 * non-reversible without MATCH_ANON_SECRET.  Fail-closed: throws if the
 * secret isn't configured so no unencoded contact IDs ever leak.
 */
export function counterpartyAnonKey(contactId: string): string {
  const secret = process.env.MATCH_ANON_SECRET;
  if (!secret) {
    throw new Error("MATCH_ANON_SECRET not configured; fail-closed");
  }
  return createHmac("sha256", secret).update(contactId).digest("hex");
}
