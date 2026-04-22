import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  checkAndUnlockMilestones,
  getProgressionState,
} from "@/lib/progression/engine";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier A: cached read, 60 rpm.
  const rate = await withRateLimit(user.id, "A");
  if (rate.response) return rate.response;

  const state = await getProgressionState(user.id);
  return NextResponse.json(state, { headers: rate.headers });
}

export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier A: occasional milestone check, 60 rpm.
  const rate = await withRateLimit(user.id, "A");
  if (rate.response) return rate.response;

  const newlyUnlocked = await checkAndUnlockMilestones(user.id);
  return NextResponse.json({ newlyUnlocked }, { headers: rate.headers });
}
