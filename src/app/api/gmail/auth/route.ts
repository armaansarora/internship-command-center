import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { getGmailAuthUrl } from "@/lib/gmail/oauth";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_MAX_AGE,
} from "@/lib/auth/oauth-state";
import { isProd } from "@/lib/env";

/**
 * Kick off the Gmail + Calendar OAuth flow.
 * Returns the Google consent URL and sets a single-use httpOnly cookie
 * containing the signed-state nonce. The callback handler verifies both.
 */
export async function GET(request?: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;
  const rawNext = request ? new URL(request.url).searchParams.get("next") : null;
  const next = rawNext ? getSafePostAuthPath(rawNext) : undefined;
  const { url, nonce } = getGmailAuthUrl(user.id, next);

  const response = NextResponse.json({ authUrl: url }, { headers: rate.headers });
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/api/gmail",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  });
  return response;
}
