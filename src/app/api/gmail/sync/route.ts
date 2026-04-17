import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { syncGmailForUser } from "@/lib/gmail/sync";

// ---------------------------------------------------------------------------
// POST /api/gmail/sync
// ---------------------------------------------------------------------------

export async function POST(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const result = await syncGmailForUser(user.id);
  return NextResponse.json(result);
}
