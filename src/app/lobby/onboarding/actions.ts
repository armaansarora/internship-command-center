"use server";

import { redirect } from "next/navigation";
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

/**
 * Server action: send the returning (now-onboarded) guest upstairs. Used
 * as the final step of the Concierge flow once Otis's extract + the
 * bootstrap discovery have completed.
 */
export async function exitLobbyToPenthouse(): Promise<never> {
  redirect("/penthouse");
}
