import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getGmailAuthUrl } from "@/lib/gmail/oauth";

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();

  const authUrl = getGmailAuthUrl(user.id);

  return NextResponse.json({ authUrl });
}
