import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { syncGmailForUser } from "@/lib/gmail/sync";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// POST /api/gmail/sync
// ---------------------------------------------------------------------------

function isGoogleNotConnectedError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("No Google tokens found");
}

export async function POST(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;

  try {
    const result = await syncGmailForUser(user.id);
    return NextResponse.json(result, { headers: rate.headers });
  } catch (err) {
    if (isGoogleNotConnectedError(err)) {
      return NextResponse.json(
        {
          error: "Google workspace is not connected.",
          code: "GOOGLE_NOT_CONNECTED",
        },
        { status: 409, headers: rate.headers },
      );
    }

    log.error("gmail.sync.manual_failed", err, { userId: user.id });
    return NextResponse.json(
      { error: "Failed to sync Gmail." },
      { status: 500, headers: rate.headers },
    );
  }
}
