import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkAndUnlockMilestones,
  getProgressionState,
} from "@/lib/progression/engine";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getProgressionState(user.id);
  return NextResponse.json(state);
}

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const newlyUnlocked = await checkAndUnlockMilestones(user.id);
  return NextResponse.json({ newlyUnlocked });
}
