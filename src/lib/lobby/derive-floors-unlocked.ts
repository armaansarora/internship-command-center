import type { FloorId } from "@/types/ui";

/**
 * R4.8 — Building Directory derivation.
 *
 * Maps a user's activity snapshot to the set of floors that should appear
 * "lit" in the Lobby's Building Directory cross-section. Pure function,
 * deterministic, dependency-free — safe to call from server components
 * and easy to test.
 *
 * Signals (all boolean):
 *   hasApplications    → floor 7 (War Room)
 *   hasContacts        → floor 6 (Rolodex Lounge)
 *   hasInterviews      → floor 3 (Briefing Room)
 *   hasCoverLetters    → floor 5 (Writing Room)
 *   hasFollowUps       → floor 4 (Situation Room)
 *   hasBriefing        → PH (Penthouse), 1 (C-Suite), 2 (Observatory)
 *   conciergeCompleted → 1 (CEO available once onboarded)
 *
 * "L" (Lobby) is always included — everyone is in the building by virtue of
 * hitting the lobby. The returned array is deduplicated; ordering is not
 * semantically meaningful (the `BuildingDirectory` component re-orders by
 * floor height for rendering), but we keep a stable order for snapshot
 * friendliness: ["L", ...insertion-order unique ids].
 */

export interface ActivitySignal {
  hasApplications: boolean;
  hasContacts: boolean;
  hasInterviews: boolean;
  hasCoverLetters: boolean;
  hasFollowUps: boolean;
  hasBriefing: boolean;
  conciergeCompleted: boolean;
}

export function deriveFloorsUnlocked(signal: ActivitySignal): FloorId[] {
  // Seed with the lobby — non-negotiable.
  const unlocked: FloorId[] = ["L"];

  const push = (floor: FloorId): void => {
    if (!unlocked.includes(floor)) unlocked.push(floor);
  };

  if (signal.hasApplications) push("7");
  if (signal.hasContacts) push("6");
  if (signal.hasCoverLetters) push("5");
  if (signal.hasFollowUps) push("4");
  if (signal.hasInterviews) push("3");

  if (signal.hasBriefing) {
    push("PH");
    push("1");
    push("2");
  }

  if (signal.conciergeCompleted) push("1");

  return unlocked;
}
