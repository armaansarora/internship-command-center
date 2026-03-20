import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, storeGoogleTokens } from "@/lib/gmail/oauth";
import type { GoogleTokens } from "@/lib/gmail/oauth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Handle OAuth denial / errors from Google
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/situation-room?error=oauth_denied`, request.nextUrl.origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/situation-room?error=missing_params`, request.nextUrl.origin)
    );
  }

  let userId: string;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { userId: string };
    userId = parsed.userId;
  } catch {
    return NextResponse.redirect(
      new URL(`/situation-room?error=invalid_state`, request.nextUrl.origin)
    );
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code);

    const tokens: GoogleTokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token ?? "",
      expiry_date: Date.now() + tokenResponse.expires_in * 1000,
    };

    await storeGoogleTokens(userId, tokens);
  } catch {
    return NextResponse.redirect(
      new URL(`/situation-room?error=token_exchange_failed`, request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(
    new URL(`/situation-room?gmail=connected`, request.nextUrl.origin)
  );
}
