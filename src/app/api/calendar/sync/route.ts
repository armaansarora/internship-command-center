import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { syncCalendarEvents } from "@/lib/calendar/sync";

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();

  const count = await syncCalendarEvents(user.id);

  return NextResponse.json({ synced: count });
}
