import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, storeGoogleTokens } from "@/lib/gmail/oauth";
import { requireUser } from "@/lib/supabase/server";
import type { GoogleTokens } from "@/lib/gmail/oauth";
import {
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/auth/oauth-state";
import { log } from "@/lib/logger";

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
  const sessionUser = await requireUser();
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Always clear the single-use state cookie on the response we return.
  const clearCookie = (response: NextResponse): NextResponse => {
    response.cookies.set(OAUTH_STATE_COOKIE, "", {
      path: "/api/gmail",
      maxAge: 0,
    });
    return response;
  };

  if (errorParam) {
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=oauth_denied", origin))
    );
  }

  if (!code || !state) {
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=missing_params", origin))
    );
  }

  const nonceCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!nonceCookie) {
    log.warn("gmail.oauth.missing_state_cookie", { userId: sessionUser.id });
    return clearCookie(
      NextResponse.redirect(new URL("/situation-room?error=missing_state", origin))
    );
  }

  const verification = verifyOAuthState(state, nonceCookie);
  if (!verification.ok) {
    log.warn("gmail.oauth.invalid_state", {
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
        new URL("/situation-room?error=token_exchange_failed", origin)
      )
    );
  }

  log.info("gmail.oauth.connected", { userId: sessionUser.id });
  return clearCookie(
    NextResponse.redirect(new URL("/situation-room?gmail=connected", origin))
  );
}
