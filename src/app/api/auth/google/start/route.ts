import { type NextRequest, NextResponse } from "next/server";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import {
  createGoogleLoginState,
  GOOGLE_LOGIN_STATE_COOKIE,
  GOOGLE_LOGIN_STATE_COOKIE_MAX_AGE,
} from "@/lib/auth/google-login-state";
import { getGoogleLoginAuthUrl } from "@/lib/auth/google-login-oauth";
import { isProd } from "@/lib/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = getSafePostAuthPath(request.nextUrl.searchParams.get("next"));
  const loginState = createGoogleLoginState(next);
  const authUrl = getGoogleLoginAuthUrl({
    state: loginState.state,
    nonce: loginState.nonce,
  });

  const response = NextResponse.json({ authUrl });
  response.cookies.set(GOOGLE_LOGIN_STATE_COOKIE, loginState.cookieValue, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/api/gmail",
    maxAge: GOOGLE_LOGIN_STATE_COOKIE_MAX_AGE,
  });
  return response;
}
