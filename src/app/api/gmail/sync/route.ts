import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { syncGmailForUser } from "@/lib/gmail/sync";

// ---------------------------------------------------------------------------
// POST /api/gmail/sync
// ---------------------------------------------------------------------------

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  const result = await syncGmailForUser(user.id);
  return NextResponse.json(result);
}
