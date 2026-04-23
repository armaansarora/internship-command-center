/**
 * user_profiles REST helpers — Concierge / onboarding surface.
 *
 * Uses the Supabase REST client (not Drizzle — per the IPv6 gotcha in
 * CLAUDE.md). All reads/writes authenticate as the caller's auth.uid()
 * via the `user_profiles_self_access` policy; no user_id scoping needed
 * in the WHERE clause beyond `id = $userId`.
 */
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";

export interface ConciergeState {
  conciergeCompletedAt: string | null;
  firstBriefingShown: boolean;
  arrivalPlayedAt: string | null;
  lastFloorVisited: string | null;
  conciergeTargetProfile: TargetProfile | null;
  floorsUnlocked: string[];
}

/**
 * Read the Concierge / Lobby state for a single user. Used by the Lobby
 * server page to decide which flow to hand to the client (cinematic vs
 * concierge vs direct-elevator), and by the Penthouse to decide whether
 * to fire the first-run briefing override.
 */
export async function getConciergeState(
  userId: string,
): Promise<ConciergeState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "concierge_completed_at, first_briefing_shown, arrival_played_at, last_floor_visited, concierge_target_profile, floors_unlocked",
    )
    .eq("id", userId)
    .single();

  if (error) {
    log.error("concierge.state_read_failed", undefined, {
      userId,
      error: error.message,
    });
    return null;
  }
  if (!data) return null;

  return {
    conciergeCompletedAt:
      (data.concierge_completed_at as string | null) ?? null,
    firstBriefingShown: Boolean(data.first_briefing_shown),
    arrivalPlayedAt: (data.arrival_played_at as string | null) ?? null,
    lastFloorVisited: (data.last_floor_visited as string | null) ?? null,
    conciergeTargetProfile:
      (data.concierge_target_profile as TargetProfile | null) ?? null,
    floorsUnlocked: Array.isArray(data.floors_unlocked)
      ? (data.floors_unlocked as string[])
      : ["L"],
  };
}

/**
 * Persist the Concierge's captured target profile + stamp completion.
 *
 * Writes the full parsed profile into `user_profiles.concierge_target_profile`
 * (jsonb) AND sets `concierge_completed_at` to now(). The canonical
 * `[target_profile_v1]` row in `agent_memory` is written separately by
 * `upsertTargetProfile()` — this helper handles the `user_profiles`-side
 * mirror only.
 */
export async function saveConciergeProfile(
  userId: string,
  profile: TargetProfile,
): Promise<{ ok: boolean; completedAt: string | null }> {
  const supabase = await createClient();
  const completedAt = new Date().toISOString();

  const { error } = await supabase
    .from("user_profiles")
    .update({
      concierge_target_profile: profile,
      concierge_completed_at: completedAt,
    })
    .eq("id", userId);

  if (error) {
    log.error("concierge.save_profile_failed", undefined, {
      userId,
      error: error.message,
    });
    return { ok: false, completedAt: null };
  }
  return { ok: true, completedAt };
}

/**
 * Atomically claim the one-time-per-account cinematic play.
 *
 * Sets `arrival_played_at = now()` only if it was previously null. Returns
 * true iff this caller won the race (the cinematic should play). Every
 * subsequent call returns false — guaranteeing no replay.
 *
 * Implementation: Supabase REST's .update() does not expose "where X is
 * null" natively, so we emulate it by passing `.is("arrival_played_at", null)`
 * filter. PostgREST honors this as `WHERE arrival_played_at IS NULL`.
 * Returns the updated row via `.select()` — if the row count is 1, we won.
 */
export async function claimArrivalPlay(
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ arrival_played_at: now })
    .eq("id", userId)
    .is("arrival_played_at", null)
    .select("arrival_played_at");

  if (error) {
    log.error("concierge.claim_arrival_failed", undefined, {
      userId,
      error: error.message,
    });
    return false;
  }

  return Array.isArray(data) && data.length === 1;
}

/**
 * Atomic first-briefing flag flip.
 *
 * Returns true iff this caller won the race and should therefore actually
 * generate the first-run Morning Briefing. Every subsequent caller within
 * the same request or later session returns false.
 */
export async function claimFirstBriefing(
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ first_briefing_shown: true })
    .eq("id", userId)
    .eq("first_briefing_shown", false)
    .select("first_briefing_shown");

  if (error) {
    log.error("concierge.claim_first_briefing_failed", undefined, {
      userId,
      error: error.message,
    });
    return false;
  }
  return Array.isArray(data) && data.length === 1;
}

/**
 * Bump `last_floor_visited` when a floor mounts. Small — no return.
 */
export async function bumpLastFloorVisited(
  userId: string,
  floorId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ last_floor_visited: floorId })
    .eq("id", userId);
  if (error) {
    log.warn("concierge.bump_last_floor_failed", {
      userId,
      floorId,
      error: error.message,
    });
  }
}

/**
 * Sync `floors_unlocked` based on the user's present activity. Used by the
 * Building Directory on each Lobby mount and on floor-level milestone
 * events. Pure function for the unlock derivation lives in
 * `src/lib/lobby/derive-floors-unlocked.ts` (R4.8).
 */
export async function setFloorsUnlocked(
  userId: string,
  floors: string[],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ floors_unlocked: floors })
    .eq("id", userId);
  if (error) {
    log.warn("concierge.set_floors_unlocked_failed", {
      userId,
      error: error.message,
    });
  }
}
