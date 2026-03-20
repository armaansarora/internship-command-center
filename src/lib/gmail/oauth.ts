import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
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
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  // Accept 32-byte hex string (64 chars) or 32-byte base64
  if (key.length === 64) return Buffer.from(key, "hex");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (hex or base64)");
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
// OAuth URL generation
// ---------------------------------------------------------------------------

export function getGmailAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID environment variable is not set");

  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  if (!redirectUri) throw new Error("GMAIL_REDIRECT_URI environment variable is not set");

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId) throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
  if (!redirectUri) throw new Error("GMAIL_REDIRECT_URI environment variable is not set");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

// ---------------------------------------------------------------------------
// Store tokens in DB (encrypted)
// ---------------------------------------------------------------------------

export async function storeGoogleTokens(
  userId: string,
  tokens: GoogleTokens
): Promise<void> {
  const supabase = await createClient();

  const encryptedTokens = encrypt(JSON.stringify(tokens));

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

export async function getGoogleTokens(userId: string): Promise<GoogleTokens> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("google_tokens")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`Failed to retrieve Google tokens: ${error.message}`);
  if (!data?.google_tokens) throw new Error("No Google tokens found for user");

  const decrypted = decrypt(data.google_tokens as string);
  const tokens = JSON.parse(decrypted) as GoogleTokens;

  // Refresh if expired (with 60-second buffer)
  const nowMs = Date.now();
  if (tokens.expiry_date - 60_000 < nowMs) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    const updatedTokens: GoogleTokens = {
      access_token: refreshed.access_token,
      refresh_token: tokens.refresh_token, // refresh token may not be returned
      expiry_date: nowMs + refreshed.expires_in * 1000,
    };
    await storeGoogleTokens(userId, updatedTokens);
    return updatedTokens;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Revoke tokens
// ---------------------------------------------------------------------------

export async function revokeGoogleTokens(userId: string): Promise<void> {
  let tokens: GoogleTokens | null = null;

  try {
    tokens = await getGoogleTokens(userId);
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ google_tokens: null })
    .eq("id", userId);

  if (error) throw new Error(`Failed to clear Google tokens: ${error.message}`);
}
