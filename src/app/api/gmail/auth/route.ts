import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
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
export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  const { url, nonce } = getGmailAuthUrl(user.id);

  const response = NextResponse.json({ authUrl: url });
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/api/gmail",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  });
  return response;
}
