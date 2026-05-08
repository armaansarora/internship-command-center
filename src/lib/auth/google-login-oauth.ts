import { requireEnv } from "@/lib/env";
import { log } from "@/lib/logger";

interface GoogleLoginTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

export function getGoogleLoginAuthUrl(args: {
  nonce: string;
  state: string;
}): string {
  const { GOOGLE_CLIENT_ID, GMAIL_REDIRECT_URI } = requireEnv([
    "GOOGLE_CLIENT_ID",
    "GMAIL_REDIRECT_URI",
  ] as const);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: args.state,
    nonce: args.nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleLoginCodeForIdToken(
  code: string,
): Promise<string> {
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
    log.warn("auth.google_login.token_exchange_failed", {
      status: response.status,
    });
    throw new Error("Google login token exchange failed");
  }

  const payload = (await response.json()) as GoogleLoginTokenResponse;
  if (!payload.id_token) {
    log.warn("auth.google_login.missing_id_token", {
      tokenType: payload.token_type ?? "unknown",
    });
    throw new Error("Google login ID token missing");
  }

  return payload.id_token;
}
