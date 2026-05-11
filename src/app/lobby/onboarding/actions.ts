"use server";

import { getUser } from "@/lib/supabase/server";
import { claimArrivalPlay } from "@/lib/db/queries/user-profiles-rest";

/**
 * Server action: atomically claim the one-time cinematic. Returns whether
 * THIS call was the first to flip `arrival_played_at`. Every subsequent
 * call returns false.
 */
export async function claimArrivalPlayAction(): Promise<{
  ok: boolean;
  shouldPlayCinematic: boolean;
}> {
  const user = await getUser();
  if (!user) return { ok: false, shouldPlayCinematic: false };
  const shouldPlayCinematic = await claimArrivalPlay(user.id);
  return { ok: true, shouldPlayCinematic };
}
