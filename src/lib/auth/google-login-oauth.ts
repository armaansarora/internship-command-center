import { createHash } from "crypto";
import { requireEnv } from "@/lib/env";
import { log } from "@/lib/logger";

interface GoogleLoginTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleLoginTokenErrorResponse {
  error?: unknown;
  error_description?: unknown;
}

export type GoogleLoginLobbyErrorCode =
  | "auth_failed"
  | "auth_restart_required"
  | "auth_unavailable";

export class GoogleLoginTokenExchangeError extends Error {
  readonly status: number;
  readonly googleError: string | null;
  readonly googleErrorDescription: string | null;

  constructor(args: {
    status: number;
    googleError: string | null;
    googleErrorDescription: string | null;
  }) {
    super(
      args.googleError
        ? `Google login token exchange failed: ${args.googleError}`
        : "Google login token exchange failed",
    );
    this.name = "GoogleLoginTokenExchangeError";
    this.status = args.status;
    this.googleError = args.googleError;
    this.googleErrorDescription = args.googleErrorDescription;
  }
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
    nonce: hashGoogleLoginNonce(args.nonce),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function hashGoogleLoginNonce(nonce: string): string {
  return createHash("sha256").update(nonce).digest("hex");
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
    const errorFields = await readGoogleLoginTokenError(response);
    log.warn("auth.google_login.token_exchange_failed", {
      status: response.status,
      googleError: errorFields.googleError ?? "unknown",
      googleErrorDescription:
        errorFields.googleErrorDescription ?? "unavailable",
    });
    throw new GoogleLoginTokenExchangeError({
      status: response.status,
      ...errorFields,
    });
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

export function getGoogleLoginTokenExchangeLobbyError(
  err: unknown,
): GoogleLoginLobbyErrorCode | null {
  if (!(err instanceof GoogleLoginTokenExchangeError)) return null;
  if (
    err.status === 429 ||
    err.status >= 500 ||
    err.googleError === "temporarily_unavailable"
  ) {
    return "auth_unavailable";
  }
  if (err.googleError === "invalid_grant") {
    return "auth_restart_required";
  }
  return "auth_failed";
}

async function readGoogleLoginTokenError(response: Response): Promise<{
  googleError: string | null;
  googleErrorDescription: string | null;
}> {
  try {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.toLowerCase().includes("application/json")) {
      const payload = (await response.json()) as GoogleLoginTokenErrorResponse;
      return {
        googleError: normaliseGoogleErrorField(payload.error),
        googleErrorDescription: normaliseGoogleErrorField(
          payload.error_description,
        ),
      };
    }

    return {
      googleError: null,
      googleErrorDescription: normaliseGoogleErrorField(await response.text()),
    };
  } catch {
    return {
      googleError: null,
      googleErrorDescription: null,
    };
  }
}

function normaliseGoogleErrorField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
}
