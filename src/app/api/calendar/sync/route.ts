import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { syncCalendarEvents } from "@/lib/calendar/sync";

export async function POST(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;

  const count = await syncCalendarEvents(user.id);

  return NextResponse.json({ synced: count }, { headers: rate.headers });
}
