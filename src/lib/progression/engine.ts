/**
 * Progression Engine — checks milestones and updates user state.
 * Uses Supabase REST only. Never imports Drizzle ORM direct postgres.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MILESTONES, type Milestone } from "./milestones";

export type FloorVisualState =
  | "construction"
  | "basic"
  | "renovated"
  | "gold"
  | "platinum";

export interface ProgressionState {
  unlockedMilestones: string[];
  level: number;
  milestones: Array<{
    id: string;
    label: string;
    description: string;
    floor: string;
    unlockedAt: string;
  }>;
}

/** Metric values gathered from the database for a given user. */
interface UserMetrics {
  applications: number;
  contacts: number;
  gmail_connected: number;
  documents: number;
  interviews: number;
  bell_rings: number;
}

async function getUserMetrics(userId: string): Promise<UserMetrics> {
  const admin = getSupabaseAdmin();

  const [appsRes, contactsRes, docsRes, interviewsRes, profileRes] =
    await Promise.all([
      admin
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "cover_letter"),
      admin
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin
        .from("user_profiles")
        .select("google_tokens")
        .eq("id", userId)
        .single(),
    ]);

  const gmailConnected =
    profileRes.data?.google_tokens != null ? 1 : 0;

  return {
    applications: appsRes.count ?? 0,
    contacts: contactsRes.count ?? 0,
    gmail_connected: gmailConnected,
    documents: docsRes.count ?? 0,
    interviews: interviewsRes.count ?? 0,
    bell_rings: 0, // tracked client-side via sessionStorage; engine treats as 0 unless externally set
  };
}

async function getAlreadyUnlocked(userId: string): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("progression_milestones")
    .select("milestone")
    .eq("user_id", userId);

  return new Set((data ?? []).map((r: { milestone: string }) => r.milestone));
}

/**
 * Checks all milestones for the user and inserts rows for newly achieved ones.
 * Also updates `user_profiles.progression_level`.
 * Returns newly unlocked milestones.
 */
export async function checkAndUnlockMilestones(
  userId: string,
): Promise<Milestone[]> {
  const [metrics, alreadyUnlocked] = await Promise.all([
    getUserMetrics(userId),
    getAlreadyUnlocked(userId),
  ]);

  const toUnlock: Milestone[] = MILESTONES.filter((m) => {
    if (alreadyUnlocked.has(m.id)) return false;
    const value = metrics[m.metric];
    return value >= m.threshold;
  });

  if (toUnlock.length === 0) return [];

  const admin = getSupabaseAdmin();

  // Insert new milestone rows
  const rows = toUnlock.map((m) => ({
    user_id: userId,
    milestone: m.id,
    floor_unlocked: m.floor,
    unlocked_at: new Date().toISOString(),
  }));

  await admin.from("progression_milestones").insert(rows);

  // Update progression_level = total unlocked milestones
  const newLevel = alreadyUnlocked.size + toUnlock.length;
  await admin
    .from("user_profiles")
    .update({ progression_level: newLevel })
    .eq("id", userId);

  return toUnlock;
}

/**
 * Returns all unlocked milestones and the current level for a user.
 */
export async function getProgressionState(
  userId: string,
): Promise<ProgressionState> {
  const admin = getSupabaseAdmin();

  const { data: rows } = await admin
    .from("progression_milestones")
    .select("milestone, unlocked_at, floor_unlocked")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: true });

  const unlocked = rows ?? [];
  const unlockedIds = new Set(unlocked.map((r: { milestone: string }) => r.milestone));

  const milestonesDetail = unlocked.map(
    (r: { milestone: string; unlocked_at: string; floor_unlocked: string | null }) => {
      const def = MILESTONES.find((m) => m.id === r.milestone);
      return {
        id: r.milestone,
        label: def?.label ?? r.milestone,
        description: def?.description ?? "",
        floor: r.floor_unlocked ?? def?.floor ?? "",
        unlockedAt: r.unlocked_at,
      };
    },
  );

  return {
    unlockedMilestones: Array.from(unlockedIds),
    level: unlocked.length,
    milestones: milestonesDetail,
  };
}

/**
 * Determines the visual state for a given floor based on unlocked milestones.
 */
export async function getFloorVisualState(
  userId: string,
  floor: string,
): Promise<FloorVisualState> {
  const state = await getProgressionState(userId);
  const unlocked = new Set(state.unlockedMilestones);

  // Platinum: tower-wide upgrade at 100 apps
  if (unlocked.has("hundred_apps")) return "platinum";

  // Gold: penthouse-gold milestone
  if (floor === "PH" && unlocked.has("fifty_apps")) return "gold";

  // Renovated: floor-specific visual upgrades
  if (floor === "7" && unlocked.has("ten_apps")) return "renovated";

  // Basic: any milestone for this floor is unlocked
  const hasFloorMilestone = MILESTONES.some(
    (m) => m.floor === floor && unlocked.has(m.id),
  );
  if (hasFloorMilestone) return "basic";

  // Construction: no milestones for this floor yet
  return "construction";
}
