/**
 * R4.1 — user_profiles onboarding columns.
 *
 * Locks in the 5 columns that R4 adds to userProfiles so that no future
 * refactor silently drops the columns the cinematic arrival, Concierge
 * flow, first-run briefing override, and Building Directory all depend on.
 */
import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { userProfiles } from "./schema";

describe("R4.1 user_profiles onboarding columns", () => {
  const columns = getTableColumns(userProfiles);

  it("adds arrival_played_at as nullable timestamptz", () => {
    const col = columns.arrivalPlayedAt;
    expect(col).toBeDefined();
    expect(col.name).toBe("arrival_played_at");
    expect(col.notNull).toBe(false);
    expect(col.hasDefault).toBe(false);
  });

  it("adds concierge_target_profile as nullable jsonb", () => {
    const col = columns.conciergeTargetProfile;
    expect(col).toBeDefined();
    expect(col.name).toBe("concierge_target_profile");
    expect(col.notNull).toBe(false);
  });

  it("adds concierge_completed_at as nullable timestamptz", () => {
    const col = columns.conciergeCompletedAt;
    expect(col).toBeDefined();
    expect(col.name).toBe("concierge_completed_at");
    expect(col.notNull).toBe(false);
    expect(col.hasDefault).toBe(false);
  });

  it("adds first_briefing_shown as notNull boolean default false", () => {
    const col = columns.firstBriefingShown;
    expect(col).toBeDefined();
    expect(col.name).toBe("first_briefing_shown");
    expect(col.notNull).toBe(true);
    expect(col.hasDefault).toBe(true);
  });

  it("adds floors_unlocked as notNull text[] defaulting to {L}", () => {
    const col = columns.floorsUnlocked;
    expect(col).toBeDefined();
    expect(col.name).toBe("floors_unlocked");
    expect(col.notNull).toBe(true);
    expect(col.hasDefault).toBe(true);
  });

  it("leaves the existing onboarding_step / progression_level / lastFloorVisited columns intact", () => {
    expect(columns.onboardingStep).toBeDefined();
    expect(columns.progressionLevel).toBeDefined();
    expect(columns.lastFloorVisited).toBeDefined();
  });
});
