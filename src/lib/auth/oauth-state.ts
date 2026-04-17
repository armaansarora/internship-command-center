import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env, requireEnv } from "@/lib/env";

/**
 * Signed OAuth state parameter.
 *
 * Format: base64url(json) + "." + hex(hmac_sha256(secret, json))
 *
 * We pair this with an httpOnly cookie containing the nonce so that:
 *  - a forged state without the matching cookie fails
 *  - a reused state cannot survive the single-use cookie
 */

const STATE_VERSION = 1;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStatePayload {
  v: number;
  nonce: string;
  userId: string;
  issuedAt: number;
  /** Optional: where to redirect on success. */
  next?: string;
}

/** Read the OAuth state secret, falling back to a dev-only default. */
function getSecret(): Buffer {
  const e = env();
  if (e.OAUTH_STATE_SECRET) return Buffer.from(e.OAUTH_STATE_SECRET, "utf8");
  // Reuse ENCRYPTION_KEY as a fallback if present — both are 32-byte secrets.
  if (e.ENCRYPTION_KEY) return Buffer.from(e.ENCRYPTION_KEY, "utf8");
  // Last resort in development only — force proper config in prod.
  const { OAUTH_STATE_SECRET } = requireEnv(["OAUTH_STATE_SECRET"] as const);
  return Buffer.from(OAUTH_STATE_SECRET, "utf8");
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("hex");
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/** Create a fresh `{ state, nonce }` pair for an OAuth kickoff. */
export function createOAuthState(args: {
  userId: string;
  next?: string;
}): { state: string; nonce: string } {
  const nonce = randomBytes(32).toString("base64url");
  const payload: OAuthStatePayload = {
    v: STATE_VERSION,
    nonce,
    userId: args.userId,
    issuedAt: Date.now(),
    ...(args.next ? { next: args.next } : {}),
  };
  const body = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return { state: `${body}.${sig}`, nonce };
}

export type VerifyResult =
  | { ok: true; payload: OAuthStatePayload }
  | { ok: false; reason: string };

/** Verify signature, expiry, nonce match, and shape. */
export function verifyOAuthState(
  state: string,
  expectedNonce: string
): VerifyResult {
  const parts = state.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed_state" };
  const [body, sig] = parts;

  const expectedSig = sign(body);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(body).toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, reason: "bad_json" };
  }

  if (payload.v !== STATE_VERSION) return { ok: false, reason: "bad_version" };
  if (typeof payload.nonce !== "string" || typeof payload.userId !== "string") {
    return { ok: false, reason: "bad_shape" };
  }

  const nonceA = Buffer.from(payload.nonce);
  const nonceB = Buffer.from(expectedNonce);
  if (nonceA.length !== nonceB.length || !timingSafeEqual(nonceA, nonceB)) {
    return { ok: false, reason: "nonce_mismatch" };
  }

  if (Date.now() - payload.issuedAt > MAX_AGE_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

export const OAUTH_STATE_COOKIE = "oauth_state_nonce";
export const OAUTH_STATE_COOKIE_MAX_AGE = MAX_AGE_MS / 1000;
