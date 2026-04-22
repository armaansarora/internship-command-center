import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/env";
import { createOAuthState } from "@/lib/auth/oauth-state";
import { deriveUserKey } from "@/lib/crypto/keys";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

interface TokenStorageOptions {
  useAdmin?: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const { ENCRYPTION_KEY } = requireEnv(["ENCRYPTION_KEY"] as const);
  // Accept 32-byte hex string (64 chars) or 32-byte base64
  if (ENCRYPTION_KEY.length === 64) return Buffer.from(ENCRYPTION_KEY, "hex");
  const buf = Buffer.from(ENCRYPTION_KEY, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (hex or base64)");
  }
  return buf;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted text format");
  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// ---------------------------------------------------------------------------
// Per-user AES-256-GCM (v2) — HKDF-derived key per user
// ---------------------------------------------------------------------------
// Blob format: `v2:<ivHex>:<ctHex>:<tagHex>` (four colon-separated fields,
// distinguishable from the legacy three-field form).
//
// Backward compatibility:
//   • `decryptForUser` recognises the `v2:` prefix and uses HKDF(master, userId).
//   • Any other input is forwarded to the legacy `decrypt` (single-master).
//   • Corrupted v2 ciphertext throws from GCM auth check — it NEVER falls
//     through to the legacy path (which would mis-decrypt into garbage or
//     swallow an auth failure silently).
//
// Lazy migration (see `getGoogleTokens`): when a legacy blob is successfully
// decrypted we re-encrypt with v2 and persist, so the fleet drains to v2
// organically without a batch re-encryption job.

function getMasterKey(): Buffer {
  // Re-use the existing env-validation + key-decoding logic so we do not
  // duplicate "how is ENCRYPTION_KEY formatted" in two places.
  return getEncryptionKey();
}

export function encryptForUser(userId: string, plaintext: string): string {
  const key = deriveUserKey(userId, getMasterKey());
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${iv.toString("hex")}:${ct.toString("hex")}:${tag.toString("hex")}`;
}

export function decryptForUser(userId: string, blob: string): string {
  if (blob.startsWith("v2:")) {
    const parts = blob.split(":");
    if (parts.length !== 4) throw new Error("Invalid v2 encrypted blob format");
    const [, ivHex, ctHex, tagHex] = parts;
    const key = deriveUserKey(userId, getMasterKey());
    const iv = Buffer.from(ivHex, "hex");
    const ct = Buffer.from(ctHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    // `final()` throws on GCM tag mismatch — we let that propagate so
    // callers see the auth failure rather than silently degrading.
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  }
  // Legacy fallback.
  return decrypt(blob);
}

// ---------------------------------------------------------------------------
// OAuth URL generation
// ---------------------------------------------------------------------------

/**
 * Build a Google OAuth URL with a cryptographically-signed state parameter.
 * The caller must also set a short-lived cookie containing `nonce` — the
 * callback verifies both, giving real CSRF protection instead of the
 * plaintext userId the previous implementation used.
 */
export function getGmailAuthUrl(userId: string): {
  url: string;
  nonce: string;
} {
  const { GOOGLE_CLIENT_ID, GMAIL_REDIRECT_URI } = requireEnv([
    "GOOGLE_CLIENT_ID",
    "GMAIL_REDIRECT_URI",
  ] as const);

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const { state, nonce } = createOAuthState({ userId });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    nonce,
  };
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URI } = requireEnv([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GMAIL_REDIRECT_URI",
  ] as const);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GMAIL_REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error("gmail.oauth.token_exchange_failed", undefined, {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new Error("Token exchange failed");
  }

  return response.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = requireEnv([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error("gmail.oauth.token_refresh_failed", undefined, {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    throw new Error("Token refresh failed");
  }

  return response.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// Store tokens in DB (encrypted)
// ---------------------------------------------------------------------------

export async function storeGoogleTokens(
  userId: string,
  tokens: GoogleTokens,
  options: TokenStorageOptions = { useAdmin: true }
): Promise<void> {
  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();

  // Per-user HKDF-derived key (v2). Never reuse the bare master key.
  const encryptedTokens = encryptForUser(userId, JSON.stringify(tokens));

  const { error } = await supabase
    .from("user_profiles")
    .update({ google_tokens: encryptedTokens })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to store Google tokens: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Retrieve tokens from DB (decrypted, auto-refresh if expired)
// ---------------------------------------------------------------------------

export async function getGoogleTokens(
  userId: string,
  options: TokenStorageOptions = {}
): Promise<GoogleTokens> {
  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("google_tokens")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`Failed to retrieve Google tokens: ${error.message}`);
  if (!data?.google_tokens) throw new Error("No Google tokens found for user");

  const ciphertext = data.google_tokens as string;
  const decrypted = decryptForUser(userId, ciphertext);
  const tokens = JSON.parse(decrypted) as GoogleTokens;

  // Lazy migration: if we successfully decrypted a legacy (v1) blob, opportunistically
  // re-encrypt under the v2 per-user key and persist. Failure here is non-fatal —
  // the in-memory tokens are still valid, so we log and continue.
  if (!ciphertext.startsWith("v2:")) {
    try {
      await storeGoogleTokens(userId, tokens, { useAdmin: true });
    } catch (e) {
      log.warn("oauth.lazy_migration_failed", { userId, error: String(e) });
    }
  }

  // Refresh if expired (with 60-second buffer)
  const nowMs = Date.now();
  if (tokens.expiry_date - 60_000 < nowMs) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    const updatedTokens: GoogleTokens = {
      access_token: refreshed.access_token,
      refresh_token: tokens.refresh_token, // refresh token may not be returned
      expiry_date: nowMs + refreshed.expires_in * 1000,
    };
    await storeGoogleTokens(userId, updatedTokens, { useAdmin: true });
    return updatedTokens;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Revoke tokens
// ---------------------------------------------------------------------------

export async function revokeGoogleTokens(
  userId: string,
  options: TokenStorageOptions = { useAdmin: true }
): Promise<void> {
  let tokens: GoogleTokens | null = null;

  try {
    tokens = await getGoogleTokens(userId, options);
  } catch {
    // Tokens may already be gone — proceed to clear DB entry
  }

  if (tokens) {
    // Best-effort revocation with Google
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokens.access_token)}`,
      { method: "POST" }
    ).catch(() => undefined);
  }

  const supabase = options.useAdmin ? getSupabaseAdmin() : await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ google_tokens: null })
    .eq("id", userId);

  if (error) throw new Error(`Failed to clear Google tokens: ${error.message}`);
}
