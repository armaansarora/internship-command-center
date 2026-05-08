import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env, requireEnv } from "@/lib/env";

const STATE_VERSION = 1;
const MAX_AGE_MS = 10 * 60 * 1000;
const STATE_PREFIX = "login_";

interface GoogleLoginStatePayload {
  v: number;
  state: string;
  nonce: string;
  next: string;
  issuedAt: number;
}

export type GoogleLoginStateVerification =
  | { ok: true; payload: GoogleLoginStatePayload }
  | { ok: false; reason: string };

function secret(): Buffer {
  const e = env();
  if (e.OAUTH_STATE_SECRET) return Buffer.from(e.OAUTH_STATE_SECRET, "utf8");
  if (e.ENCRYPTION_KEY) return Buffer.from(e.ENCRYPTION_KEY, "utf8");
  const { OAUTH_STATE_SECRET } = requireEnv(["OAUTH_STATE_SECRET"] as const);
  return Buffer.from(OAUTH_STATE_SECRET, "utf8");
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

function encodePayload(payload: GoogleLoginStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(body: string): GoogleLoginStatePayload | null {
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as
      GoogleLoginStatePayload;
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createGoogleLoginState(next: string): {
  cookieValue: string;
  nonce: string;
  state: string;
} {
  const payload: GoogleLoginStatePayload = {
    v: STATE_VERSION,
    state: `${STATE_PREFIX}${randomBytes(32).toString("base64url")}`,
    nonce: randomBytes(32).toString("base64url"),
    next,
    issuedAt: Date.now(),
  };
  const body = encodePayload(payload);
  return {
    cookieValue: `${body}.${sign(body)}`,
    nonce: payload.nonce,
    state: payload.state,
  };
}

export function verifyGoogleLoginState(
  returnedState: string,
  cookieValue: string | undefined,
): GoogleLoginStateVerification {
  if (!cookieValue) return { ok: false, reason: "missing_cookie" };

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed_cookie" };
  const [body, signature] = parts;

  if (!safeEqual(signature, sign(body))) {
    return { ok: false, reason: "bad_signature" };
  }

  const payload = decodePayload(body);
  if (!payload) return { ok: false, reason: "bad_json" };
  if (payload.v !== STATE_VERSION) return { ok: false, reason: "bad_version" };
  if (
    typeof payload.state !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.next !== "string" ||
    typeof payload.issuedAt !== "number"
  ) {
    return { ok: false, reason: "bad_shape" };
  }

  if (!safeEqual(payload.state, returnedState)) {
    return { ok: false, reason: "state_mismatch" };
  }

  if (Date.now() - payload.issuedAt > MAX_AGE_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

export function isGoogleLoginStateValue(
  state: string | null | undefined,
): boolean {
  return typeof state === "string" && state.startsWith(STATE_PREFIX);
}

export const GOOGLE_LOGIN_STATE_COOKIE = "google_login_state";
export const GOOGLE_LOGIN_STATE_COOKIE_MAX_AGE = MAX_AGE_MS / 1000;
