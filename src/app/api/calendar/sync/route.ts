import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { syncCalendarEvents } from "@/lib/calendar/sync";
import { isGoogleApiDisabledError } from "@/lib/google/api-error";
import { log } from "@/lib/logger";

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
    const count = await syncCalendarEvents(user.id, { useAdmin: true });

    return NextResponse.json({ synced: count }, { headers: rate.headers });
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
    if (isGoogleApiDisabledError(err)) {
      log.error("calendar.sync.provider_disabled", err, { userId: user.id });
      return NextResponse.json(
        {
          error:
            "Google API access is not enabled for this Tower OAuth project.",
          code: "GOOGLE_API_DISABLED",
        },
        { status: 503, headers: rate.headers },
      );
    }

    log.error("calendar.sync.manual_failed", err, { userId: user.id });
    return NextResponse.json(
      { error: "Failed to sync Google Calendar." },
      { status: 500, headers: rate.headers },
    );
  }
}
