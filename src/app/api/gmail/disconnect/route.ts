import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { revokeGoogleTokens } from "@/lib/gmail/oauth";
import { logSecurityEvent, requestMetadata } from "@/lib/audit/log";
import { log } from "@/lib/logger";

/**
 * POST /api/gmail/disconnect
 *
 * Revokes the user's Google access token best-effort and clears encrypted
 * Gmail/Calendar tokens from `user_profiles.google_tokens`.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const rate = await withRateLimit(auth.user.id, "C");
  if (rate.response) return rate.response;

  try {
    await revokeGoogleTokens(auth.user.id, { useAdmin: true });
  } catch (err) {
    log.error("gmail.oauth.disconnect_failed", err, { userId: auth.user.id });
    return NextResponse.json(
      { error: "Failed to disconnect Google" },
      { status: 500, headers: rate.headers },
    );
  }

  await logSecurityEvent({
    userId: auth.user.id,
    eventType: "oauth_disconnected",
    resourceType: "google",
    metadata: { scopes: ["gmail", "calendar"] },
    ...requestMetadata(req),
  });

  return NextResponse.json({ disconnected: true }, { headers: rate.headers });
}
