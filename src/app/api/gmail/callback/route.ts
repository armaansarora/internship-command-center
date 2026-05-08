import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, storeGoogleTokens } from "@/lib/gmail/oauth";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { GoogleTokens } from "@/lib/gmail/oauth";
import {
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/auth/oauth-state";
import {
  GOOGLE_LOGIN_STATE_COOKIE,
  isGoogleLoginStateValue,
  verifyGoogleLoginState,
} from "@/lib/auth/google-login-state";
import {
  exchangeGoogleLoginCodeForIdToken,
  getGoogleLoginTokenExchangeLobbyError,
} from "@/lib/auth/google-login-oauth";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import {
  isSupabaseAuthTimeoutError,
  isTransientSupabaseAuthError,
  withSupabaseAuthTimeout,
} from "@/lib/auth/supabase-auth-errors";
import { isEmailAllowedForBeta } from "@/lib/auth/beta-gate";
import { needsLobbyOnboardingAfterAuth } from "@/lib/auth/post-auth-profile";
import { log } from "@/lib/logger";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type GoogleIdTokenSignInResult = Awaited<
  ReturnType<SupabaseServerClient["auth"]["signInWithIdToken"]>
>;

const SUPABASE_GOOGLE_LOGIN_RETRY_DELAYS_MS = [250, 750] as const;

function connectionReturnUrl(
  origin: string,
  path: string | null | undefined,
  params: Record<string, string>,
): URL {
  const url = new URL(getSafePostAuthPath(path ?? "/situation-room"), origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

/**
 * Gmail / Calendar OAuth callback.
 *
 * Security model:
 *   1. User must have a valid session (requireUser).
 *   2. `state` query param must verify against our HMAC secret (tamper-proof).
 *   3. The embedded nonce must equal the nonce stored in the single-use
 *      httpOnly cookie set by /api/gmail/auth (replay-proof).
 *   4. The embedded userId must equal the session user (defence-in-depth).
 *   5. Cookie is cleared regardless of outcome.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const loginStateCookie = request.cookies.get(GOOGLE_LOGIN_STATE_COOKIE)?.value;
  const gmailStateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (
    isGoogleLoginStateValue(state) ||
    (loginStateCookie && !gmailStateCookie)
  ) {
    return handleLoginCallback({
      code,
      errorParam,
      origin,
      state,
      stateCookie: loginStateCookie,
    });
  }

  const sessionUser = await requireUser();

  // Always clear the single-use state cookie on the response we return.
  const clearCookie = (response: NextResponse): NextResponse => {
    response.cookies.set(OAUTH_STATE_COOKIE, "", {
      path: "/api/gmail",
      maxAge: 0,
    });
    return response;
  };

  if (errorParam) {
    log.warn("gmail.oauth.provider_denied", {
      alert: true,
      userId: sessionUser.id,
      reason: errorParam,
    });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=oauth_denied", origin))
    );
  }

  if (!code || !state) {
    log.warn("gmail.oauth.missing_params", {
      alert: true,
      userId: sessionUser.id,
      missingCode: !code,
      missingState: !state,
    });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=missing_params", origin))
    );
  }

  const nonceCookie = gmailStateCookie;
  if (!nonceCookie) {
    log.warn("gmail.oauth.missing_state_cookie", {
      alert: true,
      userId: sessionUser.id,
    });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=missing_state", origin))
    );
  }

  const verification = verifyOAuthState(state, nonceCookie);
  if (!verification.ok) {
    log.warn("gmail.oauth.invalid_state", {
      alert: true,
      userId: sessionUser.id,
      reason: verification.reason,
    });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=invalid_state", origin))
    );
  }

  if (verification.payload.userId !== sessionUser.id) {
    log.error("gmail.oauth.user_mismatch", undefined, {
      sessionUserId: sessionUser.id,
      stateUserId: verification.payload.userId,
    });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=state_user_mismatch", origin))
    );
  }

  const returnPath = verification.payload.next ?? "/situation-room";

  try {
    const tokenResponse = await exchangeCodeForTokens(code);

    const tokens: GoogleTokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token ?? "",
      expiry_date: Date.now() + tokenResponse.expires_in * 1000,
    };

    // The `handle_user_profile_sensitive_fields` trigger blocks updates to
    // `google_tokens` from the `authenticated` role; use the admin client.
    await storeGoogleTokens(sessionUser.id, tokens, { useAdmin: true });
  } catch (err) {
    log.error("gmail.oauth.token_exchange_failed", err, {
      userId: sessionUser.id,
    });
    return clearCookie(
      NextResponse.redirect(
        connectionReturnUrl(origin, returnPath, {
          error: "token_exchange_failed",
        })
      )
    );
  }

  log.info("gmail.oauth.connected", { userId: sessionUser.id });
  return clearCookie(
    NextResponse.redirect(
      connectionReturnUrl(origin, returnPath, { gmail: "connected" }),
    )
  );
}

async function handleLoginCallback(args: {
  code: string | null;
  errorParam: string | null;
  origin: string;
  state: string | null;
  stateCookie: string | undefined;
}): Promise<NextResponse> {
  const clearCookie = (response: NextResponse): NextResponse => {
    response.cookies.set(GOOGLE_LOGIN_STATE_COOKIE, "", {
      path: "/api/gmail",
      maxAge: 0,
    });
    return response;
  };

  const lobbyError = (error: string): NextResponse =>
    clearCookie(NextResponse.redirect(new URL(`/lobby?error=${error}`, args.origin)));

  if (args.errorParam) {
    log.warn("auth.google_login.provider_denied", {
      alert: true,
      reason: args.errorParam,
    });
    return lobbyError("auth_failed");
  }

  if (!args.code || !args.state) {
    log.warn("auth.google_login.missing_params", {
      alert: true,
      missingCode: !args.code,
      missingState: !args.state,
    });
    return lobbyError("auth_failed");
  }

  const verification = verifyGoogleLoginState(args.state, args.stateCookie);
  if (!verification.ok) {
    log.warn("auth.google_login.invalid_state", {
      alert: true,
      reason: verification.reason,
    });
    return lobbyError("auth_failed");
  }

  try {
    const idToken = await exchangeGoogleLoginCodeForIdToken(args.code);
    const supabase = await createClient();
    const { data, error } = await signInWithGoogleIdToken({
      supabase,
      idToken,
      nonce: verification.payload.nonce,
    });

    if (error) {
      log.warn("auth.google_login.supabase_exchange_failed", {
        alert: true,
        error: error.message,
      });
      return lobbyError(
        isTransientSupabaseAuthError(error.message)
          ? "auth_unavailable"
          : "auth_failed",
      );
    }

    const user = data.user ?? data.session?.user ?? null;
    const email = user?.email ?? null;
    if (!(await isEmailAllowedForBeta(email, { userId: user?.id }))) {
      await supabase.auth.signOut();
      log.warn("auth.google_login.beta_gate_denied", {
        domain: email?.split("@")[1] ?? "unknown",
      });
      return lobbyError("beta_not_invited");
    }

    if (await needsLobbyOnboardingAfterAuth(supabase, user)) {
      return clearCookie(NextResponse.redirect(new URL("/lobby", args.origin)));
    }

    return clearCookie(
      NextResponse.redirect(
        new URL(getSafePostAuthPath(verification.payload.next), args.origin),
      ),
    );
  } catch (err) {
    log.error("auth.google_login.failed", err);
    const googleTokenError = getGoogleLoginTokenExchangeLobbyError(err);
    if (googleTokenError) {
      return lobbyError(googleTokenError);
    }
    const message = err instanceof Error ? err.message : String(err);
    return lobbyError(
      isTransientSupabaseAuthError(message)
        ? "auth_unavailable"
        : "auth_failed",
    );
  }
}

async function signInWithGoogleIdToken(args: {
  supabase: SupabaseServerClient;
  idToken: string;
  nonce: string;
}): Promise<GoogleIdTokenSignInResult> {
  for (
    let attempt = 0;
    attempt <= SUPABASE_GOOGLE_LOGIN_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    const result = await trySignInWithGoogleIdToken(args);

    if (
      !result.error ||
      !isRetryableSupabaseGoogleLoginError(result.error.message) ||
      attempt === SUPABASE_GOOGLE_LOGIN_RETRY_DELAYS_MS.length
    ) {
      return result;
    }

    log.warn("auth.google_login.supabase_exchange_retry", {
      attempt: attempt + 1,
      error: result.error.message,
    });
    await delay(SUPABASE_GOOGLE_LOGIN_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error("Unreachable Supabase Google login retry state");
}

function isRetryableSupabaseGoogleLoginError(
  message: string | null | undefined,
): boolean {
  return (
    isTransientSupabaseAuthError(message) &&
    !isSupabaseAuthTimeoutError(message)
  );
}

async function trySignInWithGoogleIdToken(args: {
  supabase: SupabaseServerClient;
  idToken: string;
  nonce: string;
}): Promise<GoogleIdTokenSignInResult> {
  try {
    return await withSupabaseAuthTimeout(
      args.supabase.auth.signInWithIdToken({
        provider: "google",
        token: args.idToken,
        nonce: args.nonce,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: { user: null, session: null },
      error: { message },
    } as GoogleIdTokenSignInResult;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
