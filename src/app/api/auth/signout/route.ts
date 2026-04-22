import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Tier C: side-effectful op, 5 rpm. We need the user's id BEFORE sign-out
  // so we can still rate-limit by user identity (a malicious loop of signouts
  // without a user would just bounce off the `getUser` nullcheck below).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const rate = await withRateLimit(user.id, "C");
    if (rate.response) return rate.response;
  }

  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/lobby`, { status: 302 });
}
