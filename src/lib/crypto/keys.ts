import { hkdfSync } from "crypto";

/**
 * Derive a per-user 32-byte key from the server master via HKDF-SHA256.
 *
 * Salt contains a version token so future rotation (e.g. `v2`) can be
 * introduced without invalidating existing ciphertexts — we simply bump
 * the blob prefix and switch salt in lockstep. `info` is the user's UUID
 * so two users never share the same derived key.
 *
 * Reference: docs/NEXT-ROADMAP.md §4 Climate — per-user key via HKDF on a
 * server master.
 */
export function deriveUserKey(userId: string, master: Buffer): Buffer {
  const salt = Buffer.from("tower.gmail.oauth.v1");
  const info = Buffer.from(userId);
  const okm = hkdfSync("sha256", master, salt, info, 32);
  return Buffer.from(okm);
}
